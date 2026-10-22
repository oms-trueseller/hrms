"use client";

import { KEYS, newId, readCollection, useCollection, writeCollection } from "./store";
import { parseKey } from "./time";
import type { Leave, LeaveStatus, LeaveType } from "./types";

export const LEAVE_TYPES: LeaveType[] = ["Casual", "Sick", "Paid", "Unpaid"];
/** Annual allowance in days. Unpaid has no cap. */
export const LEAVE_QUOTA: Partial<Record<LeaveType, number>> = { Casual: 12, Sick: 8, Paid: 15 };

export function useLeaves() {
  const { items, ready } = useCollection<Leave>(KEYS.leaves);
  return { leaves: items, ready };
}

export function leaveDays(l: Pick<Leave, "from" | "to">): number {
  return Math.round((parseKey(l.to).getTime() - parseKey(l.from).getTime()) / 86400000) + 1;
}

export function applyLeave(input: Pick<Leave, "userId" | "type" | "from" | "to" | "reason">) {
  writeCollection(KEYS.leaves, [
    ...readCollection<Leave>(KEYS.leaves),
    { ...input, id: newId(), status: "pending", createdAt: new Date().toISOString() },
  ]);
}

export function setLeaveStatus(id: string, status: LeaveStatus) {
  writeCollection(
    KEYS.leaves,
    readCollection<Leave>(KEYS.leaves).map((l) => (l.id === id ? { ...l, status } : l)),
  );
}

export function cancelLeave(id: string) {
  writeCollection(
    KEYS.leaves,
    readCollection<Leave>(KEYS.leaves).filter((l) => l.id !== id),
  );
}
