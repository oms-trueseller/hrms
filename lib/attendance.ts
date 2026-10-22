"use client";

import useSWR from "swr";
import { api, refresh } from "./api";
import { dateKey, parseKey } from "./time";
import type { Leave, Session } from "./types";

/** Work policy: 8h net work per day, up to 1h of break allowed, 176h net per month. */
export const DAY_TARGET_MS = 8 * 3600_000;
export const BREAK_ALLOWED_MS = 3600_000;
export const MONTH_TARGET_MS = 176 * 3600_000;
export const SHORT_DAY_MS = 4 * 3600_000;

/**
 * Sessions for a date range (YYYY-MM-DD, inclusive). Open sessions are always included.
 * Admins can pass `userId` ("all" or an id); employees only ever receive their own.
 */
export function useAttendance(range: { from: string; to: string; userId?: string }) {
  const q = new URLSearchParams({ from: range.from, to: range.to });
  if (range.userId) q.set("userId", range.userId);
  const { data } = useSWR<{ sessions: Session[] }>(`/api/attendance?${q}`, api, {
    keepPreviousData: true,
  });
  return { sessions: data?.sessions ?? [], ready: !!data };
}

type Action = "punchIn" | "punchOut" | "startBreak" | "endBreak";

/** Throws with the server's message on failure. */
export async function attendanceAction(action: Action) {
  await api("/api/attendance", { method: "POST", body: { action, date: dateKey(Date.now()) } });
  await refresh("/api/attendance");
}

export const activeSession = (sessions: Session[], userId: string) =>
  sessions.find((s) => s.userId === userId && !s.punchOut);

export const onBreak = (s: Session) => s.breaks.some((b) => !b.end);

export function breakMs(s: Session, now: number): number {
  const stop = s.punchOut ? new Date(s.punchOut).getTime() : now;
  return s.breaks.reduce((sum, b) => {
    const end = b.end ? new Date(b.end).getTime() : stop;
    return sum + Math.max(0, end - new Date(b.start).getTime());
  }, 0);
}

/** Worked time excluding breaks. */
export function workedMs(s: Session, now: number): number {
  const end = s.punchOut ? new Date(s.punchOut).getTime() : now;
  return Math.max(0, end - new Date(s.punchIn).getTime() - breakMs(s, now));
}


export type DayStatus =
  | "Working"
  | "Full day"
  | "Short"
  | "Very short"
  | "On leave"
  | "Weekend"
  | "Not in yet"
  | "Absent";

export interface DaySummary {
  date: string;
  userId?: string;
  status: DayStatus;
  sessions: Session[];
  firstIn?: string;
  lastOut?: string;
  /** Net worked time (breaks excluded). */
  workedMs: number;
  breakMs: number;
  /** On-site time: worked + break. */
  grossMs: number;
  /** Break taken beyond the 1h allowance. */
  breakOverMs: number;
  /** Net work expected on this day (8h on a working weekday, else 0). */
  expectedMs: number;
  /** worked − expected; null while the day is still in progress. */
  deltaMs: number | null;
}

export function summarizeDay(
  date: string,
  daySessions: Session[],
  leaves: Leave[],
  now: number,
  userId?: string,
): DaySummary {
  const sorted = [...daySessions].sort((a, b) => a.punchIn.localeCompare(b.punchIn));
  const worked = sorted.reduce((n, s) => n + workedMs(s, now), 0);
  const brk = sorted.reduce((n, s) => n + breakMs(s, now), 0);
  const active = sorted.some((s) => !s.punchOut);
  const dow = parseKey(date).getDay();
  const weekend = dow === 0 || dow === 6;
  const onLeave = leaves.some((l) => l.status === "approved" && l.from <= date && date <= l.to);
  const isToday = date === dateKey(now);
  const expected = weekend || onLeave ? 0 : DAY_TARGET_MS;

  let status: DayStatus;
  if (sorted.length) {
    status = active
      ? "Working"
      : worked >= DAY_TARGET_MS
        ? "Full day"
        : worked >= SHORT_DAY_MS
          ? "Short"
          : "Very short";
  } else if (onLeave) status = "On leave";
  else if (weekend) status = "Weekend";
  else if (isToday) status = "Not in yet";
  else status = "Absent";

  const inProgress = status === "Working" || status === "Not in yet";
  return {
    date,
    userId,
    status,
    sessions: sorted,
    firstIn: sorted[0]?.punchIn,
    lastOut: active ? undefined : sorted[sorted.length - 1]?.punchOut,
    workedMs: worked,
    breakMs: brk,
    grossMs: worked + brk,
    breakOverMs: Math.max(0, brk - BREAK_ALLOWED_MS),
    expectedMs: inProgress ? 0 : expected,
    deltaMs: inProgress ? null : worked - expected,
  };
}

/** Day-by-day rows for a month (YYYY-MM), newest first, never past today. */
export function buildMonth(
  month: string,
  userSessions: Session[],
  userLeaves: Leave[],
  now: number,
): DaySummary[] {
  const [y, m] = month.split("-").map(Number);
  const today = dateKey(now);
  const days = new Date(y, m, 0).getDate();
  const rows: DaySummary[] = [];
  for (let d = days; d >= 1; d--) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (date > today) continue;
    rows.push(
      summarizeDay(date, userSessions.filter((s) => s.date === date), userLeaves, now),
    );
  }
  return rows;
}

export interface MonthSummary {
  workedMs: number;
  breakMs: number;
  grossMs: number;
  /** 176h monthly target. */
  targetMs: number;
  remainingMs: number;
  /** Net work expected for completed days so far (8h per working weekday, minus approved leave). */
  expectedSoFarMs: number;
  /** Time beyond 8h on completed days (weekend work counts fully as extra). */
  extraMs: number;
  /** Time under 8h on completed working days, absent days counting as 8h short. */
  shortMs: number;
  /** extra − short (= worked − expectedSoFar): positive = ahead, negative = behind. */
  balanceMs: number;
  daysWorked: number;
  fullDays: number;
  shortDays: number;
  absentDays: number;
  leaveDays: number;
  breakOverDays: number;
  breakOverMs: number;
}

export function summarizeMonth(rows: DaySummary[]): MonthSummary {
  const sum = (f: (r: DaySummary) => number) => rows.reduce((n, r) => n + f(r), 0);
  const count = (s: DayStatus) => rows.filter((r) => r.status === s).length;
  const worked = sum((r) => r.workedMs);
  const expected = sum((r) => r.expectedMs);
  return {
    workedMs: worked,
    breakMs: sum((r) => r.breakMs),
    grossMs: sum((r) => r.grossMs),
    targetMs: MONTH_TARGET_MS,
    remainingMs: Math.max(0, MONTH_TARGET_MS - worked),
    expectedSoFarMs: expected,
    // An in-progress day (delta null) never counts as extra or short.
    extraMs: sum((r) => Math.max(0, r.deltaMs ?? 0)),
    shortMs: sum((r) => Math.max(0, -(r.deltaMs ?? 0))),
    balanceMs: sum((r) => r.deltaMs ?? 0),
    // Completed days only: has punches and nothing still running.
    daysWorked: rows.filter((r) => r.sessions.length > 0 && r.status !== "Working").length,
    fullDays: count("Full day"),
    shortDays: count("Short") + count("Very short"),
    absentDays: count("Absent"),
    leaveDays: count("On leave"),
    breakOverDays: rows.filter((r) => r.breakOverMs > 0).length,
    breakOverMs: sum((r) => r.breakOverMs),
  };
}

export interface EntryInput {
  date: string; // YYYY-MM-DD
  inTime: string; // HH:MM
  outTime: string; // HH:MM
  breakMinutes: number;
}

// Times are built in the browser's local timezone so the stored instants match what the user typed.
const entryBody = (e: EntryInput) => ({
  date: e.date,
  punchIn: new Date(`${e.date}T${e.inTime}`).toISOString(),
  punchOut: new Date(`${e.date}T${e.outTime}`).toISOString(),
  breakMinutes: e.breakMinutes,
});

/** Add a past day's attendance by hand. Throws with the server's message on failure. */
export async function addEntry(e: EntryInput) {
  await api("/api/attendance", { method: "POST", body: { action: "manual", ...entryBody(e) } });
  await refresh("/api/attendance");
}

export async function updateEntry(id: string, e: EntryInput) {
  await api(`/api/attendance/${id}`, { method: "PATCH", body: entryBody(e) });
  await refresh("/api/attendance");
}

export async function deleteEntry(id: string) {
  await api(`/api/attendance/${id}`, { method: "DELETE" });
  await refresh("/api/attendance");
}
