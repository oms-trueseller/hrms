export type Role = "admin" | "employee";

/** Full profile: returned by login, signup and /api/auth/me (the Profile page uses every field). */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  phone: string;
  joinedAt: string; // ISO
}

/** Admin employee list: the fields that page shows (no phone). */
export type UserListItem = Omit<User, "phone">;

/** A reason given for a long break. */
export interface LongBreak {
  at: string; // ISO: when the break ended
  minutes: number; // length of that break
  totalMinutes: number; // the day's total break at that moment
  reason: string;
}

/**
 * One punch-in/punch-out pair. A day can have several.
 * Breaks are sent as totals, not as a list: the UI only needs the time already taken and whether
 * a break is running right now.
 */
export interface Session {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD (IST) of punch in
  punchIn: string; // ISO
  punchOut?: string;
  /** Total of finished breaks, in ms. */
  breakMs: number;
  /** Start of the break running right now (ISO), if any. */
  breakStart?: string;
  /** The running break started by itself (at the automatic break time). */
  breakAuto?: boolean;
  /** Reasons for long breaks. Only present when there are any. */
  longBreaks?: LongBreak[];
}

export type LeaveType = "Casual" | "Sick" | "Paid" | "Unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

/** Just the dates and status: enough to mark days "On leave". */
export interface LeaveSpan {
  from: string; // YYYY-MM-DD
  to: string;
  status: LeaveStatus;
  /** Present on the admin all-employees list. */
  userId?: string;
}

/** A leave request as listed on the Leaves pages. `userId` is only sent on the admin list. */
export interface Leave extends LeaveSpan {
  id: string;
  type: LeaveType;
  reason: string;
}
