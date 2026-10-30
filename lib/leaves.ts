"use client";

import useSWR from "swr";
import { api, errorMessage, refresh } from "./api";
import { DAY_TARGET_MS } from "./attendance";
import { addDays, weekday } from "./time";
import type { Leave, LeaveSpan, LeaveStatus, LeaveType } from "./types";

export const LEAVE_TYPES: LeaveType[] = ["Casual", "Sick", "Paid", "Unpaid"];
/** Annual allowance in days. Unpaid has no cap. */
export const LEAVE_QUOTA: Partial<Record<LeaveType, number>> = { Casual: 12, Sick: 8, Paid: 15 };

/** My leaves, or everyone's when `all` (admin only). */
export function useLeaves(all = false) {
  const { data } = useSWR<{ leaves: Leave[] }>(all ? "/api/leaves?scope=all" : "/api/leaves", api);
  return { leaves: data?.leaves ?? [], ready: !!data };
}

/**
 * Approved leaves as plain date ranges, for marking days "On leave" (Dashboard, History, All attendance).
 * Much smaller than the full list. With `all` (admin) each carries userId.
 */
export function useLeaveSpans(all = false) {
  const { data } = useSWR<{ leaves: LeaveSpan[] }>(all ? "/api/leaves?view=calendar&scope=all" : "/api/leaves?view=calendar", api);
  return data?.leaves ?? [];
}

/** Working days (Mon-Fri) a leave covers, as YYYY-MM-DD. Saturdays and Sundays are days off, not leave. */
export function leaveDates(l: Pick<Leave, "from" | "to">): string[] {
  const out: string[] = [];
  for (let d = l.from, guard = 0; d <= l.to && guard < 400; d = addDays(d, 1), guard++) {
    const w = weekday(d);
    if (w !== 0 && w !== 6) out.push(d);
  }
  return out;
}

export const leaveDays = (l: Pick<Leave, "from" | "to">): number => leaveDates(l).length;

export interface LeaveUsage {
  /** Working days the leave covers. */
  days: number;
  /** Past leave days on which the employee still worked a full day. They are not counted as leave. */
  returned: string[];
  /** Days that count against the balance: days minus returned. */
  counted: number;
}

/**
 * How many days of an approved leave really count. A day the employee came in and worked a full
 * day (8h, breaks excluded) was not taken off, so it is returned to their balance.
 * `workedByDate` is net worked ms per day from finished sessions; `today` is the IST date.
 */
export function leaveUsage(
  l: Pick<Leave, "from" | "to">,
  workedByDate: Record<string, number>,
  today: string,
): LeaveUsage {
  const dates = leaveDates(l);
  const returned = dates.filter((d) => d <= today && (workedByDate[d] ?? 0) >= DAY_TARGET_MS);
  return { days: dates.length, returned, counted: dates.length - returned.length };
}

export interface LeaveCount {
  /** Leave days already taken (past working days that were not worked in full). */
  taken: number;
  /** Past leave days the employee worked a full day on, so they do not count. */
  returned: number;
  /** Approved leave days still ahead. */
  upcoming: number;
  /** `taken`, split by leave type. */
  byType: Partial<Record<LeaveType, number>>;
}

/**
 * Counts one employee's approved leave days that fall between `from` and `to` (YYYY-MM-DD, inclusive).
 * Working days only (Mon-Fri); a day worked in full (8h) is returned, not counted.
 */
export function countLeaves(
  leaves: LeaveSpan[],
  from: string,
  to: string,
  today: string,
  workedByDate: Record<string, number>,
): LeaveCount {
  const c: LeaveCount = { taken: 0, returned: 0, upcoming: 0, byType: {} };
  for (const l of leaves) {
    if (l.status !== "approved") continue;
    for (const d of leaveDates(l)) {
      if (d < from || d > to) continue;
      if (d > today) c.upcoming++;
      else if ((workedByDate[d] ?? 0) >= DAY_TARGET_MS) c.returned++;
      else {
        c.taken++;
        if (l.type) c.byType[l.type] = (c.byType[l.type] ?? 0) + 1;
      }
    }
  }
  return c;
}

/** Returns an error message, or null on success. */
export async function applyLeave(input: Pick<Leave, "type" | "from" | "to" | "reason">): Promise<string | null> {
  try {
    await api("/api/leaves", { method: "POST", body: input });
    await refresh("/api/leaves");
    return null;
  } catch (e) {
    return errorMessage(e);
  }
}

export async function setLeaveStatus(id: string, status: LeaveStatus) {
  await api(`/api/leaves/${id}`, { method: "PATCH", body: { status } });
  await refresh("/api/leaves");
}

export async function cancelLeave(id: string) {
  await api(`/api/leaves/${id}`, { method: "DELETE" });
  await refresh("/api/leaves");
}
