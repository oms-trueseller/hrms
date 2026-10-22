"use client";

import useSWR from "swr";
import { api, errorMessage, refresh } from "./api";
import { parseKey } from "./time";
import type { Leave, LeaveStatus, LeaveType } from "./types";

export const LEAVE_TYPES: LeaveType[] = ["Casual", "Sick", "Paid", "Unpaid"];
/** Annual allowance in days. Unpaid has no cap. */
export const LEAVE_QUOTA: Partial<Record<LeaveType, number>> = { Casual: 12, Sick: 8, Paid: 15 };

/** My leaves, or everyone's when `all` (admin only). */
export function useLeaves(all = false) {
  const { data } = useSWR<{ leaves: Leave[] }>(all ? "/api/leaves?scope=all" : "/api/leaves", api);
  return { leaves: data?.leaves ?? [], ready: !!data };
}

export function leaveDays(l: Pick<Leave, "from" | "to">): number {
  return Math.round((parseKey(l.to).getTime() - parseKey(l.from).getTime()) / 86400000) + 1;
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
