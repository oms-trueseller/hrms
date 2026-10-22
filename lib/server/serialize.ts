/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Leave, Session, User } from "@/lib/types";

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : undefined);

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

export const toSession = (s: any): Session => ({
  id: String(s._id),
  userId: String(s.userId),
  date: s.date,
  punchIn: iso(s.punchIn)!,
  punchOut: iso(s.punchOut),
  breaks: (s.breaks ?? []).map((b: any) => ({ start: iso(b.start)!, end: iso(b.end) })),
  manual: s.manual || undefined,
});

export const toLeave = (l: any): Leave => ({
  id: String(l._id),
  userId: String(l.userId),
  type: l.type,
  from: l.from,
  to: l.to,
  reason: l.reason,
  status: l.status,
  createdAt: iso(l.createdAt)!,
});
