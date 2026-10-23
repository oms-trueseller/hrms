/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Leave, LeaveSpan, Session, User, UserListItem } from "@/lib/types";

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : undefined);

// Each serializer returns only the fields the UI reads. Pair every one with a matching
// `select` projection on the query so unused fields are never fetched from the database either.

/** Fields to select for toUser. */
export const USER_FIELDS = "name email role department designation phone createdAt";
export const USER_LIST_FIELDS = "name email role department designation createdAt";

export const toUser = (u: any): User => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department ?? "",
  designation: u.designation ?? "",
  phone: u.phone ?? "",
  joinedAt: iso(u.createdAt)!,
});

export const toUserListItem = (u: any): UserListItem => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  department: u.department ?? "",
  designation: u.designation ?? "",
  joinedAt: iso(u.createdAt)!,
});

/** Fields to select for toSession. */
export const SESSION_FIELDS = "userId date punchIn punchOut breaks";

export const toSession = (s: any): Session => {
  let breakMs = 0;
  let breakStart: string | undefined;
  for (const b of s.breaks ?? []) {
    if (b.end) breakMs += new Date(b.end).getTime() - new Date(b.start).getTime();
    else breakStart = iso(b.start);
  }
  return {
    id: String(s._id),
    userId: String(s.userId),
    date: s.date,
    punchIn: iso(s.punchIn)!,
    punchOut: iso(s.punchOut),
    breakMs,
    breakStart,
  };
};

/** Fields to select for toLeave (add `userId` for the admin list). */
export const LEAVE_FIELDS = "type from to reason status";

export const toLeave = (l: any, withUser = false): Leave => ({
  id: String(l._id),
  type: l.type,
  from: l.from,
  to: l.to,
  reason: l.reason,
  status: l.status,
  ...(withUser ? { userId: String(l.userId) } : {}),
});

/** Fields to select for toLeaveSpan. */
export const LEAVE_SPAN_FIELDS = "from to status";

export const toLeaveSpan = (l: any, withUser = false): LeaveSpan => ({
  from: l.from,
  to: l.to,
  status: l.status,
  ...(withUser ? { userId: String(l.userId) } : {}),
});
