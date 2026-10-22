"use client";

import { KEYS, newId, readCollection, useCollection, writeCollection } from "./store";
import { dateKey, parseKey } from "./time";
import type { Leave, Session } from "./types";

export const FULL_DAY_MS = 8 * 3600_000;
export const HALF_DAY_MS = 4 * 3600_000;

export function useAttendance() {
  const { items, ready } = useCollection<Session>(KEYS.attendance);
  return { sessions: items, ready };
}

function update(fn: (all: Session[]) => Session[]) {
  writeCollection(KEYS.attendance, fn(readCollection<Session>(KEYS.attendance)));
}

const isOpen = (s: Session, userId: string) => s.userId === userId && !s.punchOut;

export function punchIn(userId: string) {
  update((all) => {
    if (all.some((s) => isOpen(s, userId))) return all;
    const now = new Date();
    return [
      ...all,
      { id: newId(), userId, date: dateKey(now), punchIn: now.toISOString(), breaks: [] },
    ];
  });
}

export function punchOut(userId: string) {
  const iso = new Date().toISOString();
  update((all) =>
    all.map((s) =>
      isOpen(s, userId)
        ? {
            ...s,
            punchOut: iso,
            breaks: s.breaks.map((b) => (b.end ? b : { ...b, end: iso })),
          }
        : s,
    ),
  );
}

export function startBreak(userId: string) {
  const iso = new Date().toISOString();
  update((all) =>
    all.map((s) =>
      isOpen(s, userId) && !onBreak(s) ? { ...s, breaks: [...s.breaks, { start: iso }] } : s,
    ),
  );
}

export function endBreak(userId: string) {
  const iso = new Date().toISOString();
  update((all) =>
    all.map((s) =>
      isOpen(s, userId)
        ? { ...s, breaks: s.breaks.map((b) => (b.end ? b : { ...b, end: iso })) }
        : s,
    ),
  );
}

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

export function activeSession(sessions: Session[], userId: string) {
  return sessions.find((s) => isOpen(s, userId));
}

export type DayStatus = "Working" | "Present" | "Half day" | "On leave" | "Weekend" | "Absent";

export interface DaySummary {
  date: string;
  userId?: string;
  status: DayStatus;
  sessions: Session[];
  firstIn?: string;
  lastOut?: string;
  workedMs: number;
  breakMs: number;
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
  let status: DayStatus;
  if (sorted.length) status = active ? "Working" : worked >= HALF_DAY_MS ? "Present" : "Half day";
  else if (leaves.some((l) => l.status === "approved" && l.from <= date && date <= l.to)) status = "On leave";
  else if (dow === 0 || dow === 6) status = "Weekend";
  else status = "Absent";
  return {
    date,
    userId,
    status,
    sessions: sorted,
    firstIn: sorted[0]?.punchIn,
    lastOut: active ? undefined : sorted[sorted.length - 1]?.punchOut,
    workedMs: worked,
    breakMs: brk,
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
