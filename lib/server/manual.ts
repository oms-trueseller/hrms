import { DATE_RE } from "./api";
import { Attendance } from "@/models/Attendance";

export interface Entry {
  date: string;
  punchIn: Date;
  punchOut: Date;
  breaks: { start: Date; end: Date }[];
}

const HOUR = 3600_000;

/** Today's date in IST (the app's time zone), YYYY-MM-DD. */
export function istToday(): string {
  return new Date(Date.now() + 5.5 * HOUR).toISOString().slice(0, 10);
}

/** Validates a hand-entered attendance record. Returns the parsed entry or an error message. */
export function parseEntry(b: Record<string, unknown>): Entry | string {
  const date = String(b.date ?? "");
  const punchIn = new Date(String(b.punchIn ?? ""));
  const punchOut = new Date(String(b.punchOut ?? ""));
  const breakMin = Number(b.breakMinutes ?? 0);
  const now = Date.now();

  if (!DATE_RE.test(date)) return "Pick a valid date.";
  if (isNaN(punchIn.getTime()) || isNaN(punchOut.getTime())) return "Enter valid in and out times.";
  if (punchOut <= punchIn) return "Out time must be after in time.";
  const span = punchOut.getTime() - punchIn.getTime();
  if (span > 20 * HOUR) return "A single entry cannot be longer than 20 hours.";
  if (!Number.isFinite(breakMin) || breakMin < 0) return "Break must be 0 or more minutes.";
  if (breakMin * 60_000 > span) return "Break cannot be longer than the time on site.";
  if (punchOut.getTime() > now + 60_000) return "Out time cannot be in the future.";
  if (punchIn.getTime() < now - 366 * 24 * HOUR) return "Entries older than a year cannot be added.";
  // The date label must match the punch-in day (allowing for timezone offsets).
  if (Math.abs(punchIn.getTime() - new Date(`${date}T00:00:00Z`).getTime()) > 36 * HOUR) {
    return "Date does not match the in time.";
  }

  // Backfilled breaks are stored as one block centred in the shift; only the total matters.
  const mid = punchIn.getTime() + span / 2;
  const half = (breakMin * 60_000) / 2;
  const breaks = breakMin > 0 ? [{ start: new Date(mid - half), end: new Date(mid + half) }] : [];
  return { date, punchIn, punchOut, breaks };
}

/** Another session of this user that overlaps the entry (an open session counts as overlapping). */
export function findOverlap(userId: string, e: Entry, excludeId?: string) {
  return Attendance.exists({
    userId,
    date: e.date,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    punchIn: { $lt: e.punchOut },
    $or: [{ punchOut: { $gt: e.punchIn } }, { open: true }],
  });
}
