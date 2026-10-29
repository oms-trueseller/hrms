import { Attendance } from "@/models/Attendance";

/** A day's total break above this (65 min) needs a reason when the break ends. Keep equal to lib/attendance.ts. */
export const BREAK_REASON_MS = 65 * 60_000;
export const REASON_MAX = 200;
export const REASON_MIN = 3;

type RawBreak = { start: Date; end?: Date };

export interface BreakCheck {
  /** The user has a running break. */
  onBreak: boolean;
  /** Length of the running break so far, in ms. */
  thisBreakMs: number;
  /** The day's total break if it ended now, in ms. */
  totalMs: number;
  /** Ending it now needs a reason. */
  needsReason: boolean;
}

const closedMs = (bs: RawBreak[] = []) =>
  bs.reduce((n, b) => n + (b.end ? new Date(b.end).getTime() - new Date(b.start).getTime() : 0), 0);

/** Looks at a user's open session and works out what ending the running break (if any) would mean. */
export async function checkBreak(userId: string, now: Date): Promise<BreakCheck | null> {
  const open = await Attendance.findOne({ userId, open: true })
    .select("date breaks")
    .lean<{ _id: unknown; date: string; breaks?: RawBreak[] }>();
  if (!open) return null;

  const running = (open.breaks ?? []).find((b) => !b.end);
  if (!running) return { onBreak: false, thisBreakMs: 0, totalMs: 0, needsReason: false };

  // The day's other sessions (an earlier punch-in/out the same day) count towards the same total.
  const others = await Attendance.find({ userId, date: open.date, _id: { $ne: open._id } })
    .select("breaks")
    .lean<{ breaks?: RawBreak[] }[]>();

  const thisBreakMs = Math.max(0, now.getTime() - new Date(running.start).getTime());
  const totalMs = closedMs(open.breaks) + others.reduce((n, s) => n + closedMs(s.breaks), 0) + thisBreakMs;
  return { onBreak: true, thisBreakMs, totalMs, needsReason: totalMs > BREAK_REASON_MS };
}

/** Cleans up a reason from the request. Returns the text, "" if absent, or an error message. */
export function parseReason(raw: unknown): string | { error: string } {
  if (raw === undefined || raw === null || raw === "") return "";
  const text = String(raw).trim().replace(/\s+/g, " ");
  if (text.length < REASON_MIN) return { error: `Please write at least ${REASON_MIN} characters for the reason.` };
  if (text.length > REASON_MAX) return { error: `The reason must be ${REASON_MAX} characters or fewer.` };
  return text;
}
