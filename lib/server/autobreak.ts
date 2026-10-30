import { Attendance } from "@/models/Attendance";

/**
 * IST time of day when a break starts on its own for everyone who is working.
 * It only STARTS the break: the employee ends it (End break), exactly like a break they started themselves.
 */
export const AUTO_BREAK_AT = "13:00";

type Brk = { start: Date; end?: Date; auto?: boolean };

/** The parts of a session this needs. */
export interface AutoBreakDoc {
  _id: unknown;
  open?: boolean;
  date: string;
  punchIn: Date;
  autoBreak?: boolean;
  breaks?: Brk[];
}

/** Today's IST date, and the moment the auto break starts today. */
export function autoBreakWindow(now = new Date()) {
  const today = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
  return { today, start: new Date(`${today}T${AUTO_BREAK_AT}:00+05:30`) };
}

/**
 * Should this session get its automatic break? Yes when, after the start time, it is a running session
 * from today that began before the start time, has not had one yet, and the employee is not already
 * on (or has not already taken) a break that covers the start time.
 */
export function needsAutoBreak(s: AutoBreakDoc, now = new Date()): boolean {
  const { today, start } = autoBreakWindow(now);
  if (now < start) return false;
  return (
    !!s.open &&
    s.date === today &&
    !s.autoBreak &&
    new Date(s.punchIn) < start &&
    !(s.breaks ?? []).some((b) => !b.end || new Date(b.end) > start)
  );
}

/** Same rule as needsAutoBreak, as a database filter (so the update is atomic and never doubles up). */
const pending = (today: string, start: Date) => ({
  open: true,
  date: today,
  autoBreak: { $ne: true },
  punchIn: { $lt: start },
  breaks: { $not: { $elemMatch: { $or: [{ end: { $exists: false } }, { end: { $gt: start } }] } } },
});

const startBreak = (start: Date) => ({
  $push: { breaks: { start, auto: true } },
  $set: { autoBreak: true },
});

/**
 * Starts the automatic break on sessions you have already loaded (and updates those objects in place),
 * so a read needs no extra query unless a break is actually due.
 */
export async function applyAutoBreakTo(docs: AutoBreakDoc[], now = new Date()): Promise<void> {
  const due = docs.filter((s) => needsAutoBreak(s, now));
  if (!due.length) return;
  const { today, start } = autoBreakWindow(now);
  await Attendance.updateMany({ ...pending(today, start), _id: { $in: due.map((s) => s._id) } }, startBreak(start));
  for (const s of due) {
    (s.breaks ??= []).push({ start, auto: true });
    s.autoBreak = true;
  }
}

// People already checked today, per server process. After the first check past the start time a new
// session can only start after it, so it can never be due, and later clicks can skip the database call.
// (Reading the attendance list still checks every session it loads, so an admin edit is caught there.)
const checked = new Map<string, string>();

/** Starts the automatic break for one user's (or everyone's) running sessions. Call before acting on a break. */
export async function applyAutoBreakFor(userId: string | "all", now = new Date()): Promise<void> {
  const { today, start } = autoBreakWindow(now);
  if (now < start) return;
  if (userId !== "all" && checked.get(userId) === today) return;
  await Attendance.updateMany({ ...pending(today, start), ...(userId === "all" ? {} : { userId }) }, startBreak(start));
  if (userId !== "all") {
    if (checked.size > 5000) checked.clear(); // bound memory
    checked.set(userId, today);
  }
}
