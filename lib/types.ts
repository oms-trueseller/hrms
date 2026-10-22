export type Role = "admin" | "employee";

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

export interface Break {
  start: string; // ISO
  end?: string;
}

/** One punch-in/punch-out pair. A day can have several. */
export interface Session {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD (local) of punch in
  punchIn: string; // ISO
  punchOut?: string;
  breaks: Break[];
}

export type LeaveType = "Casual" | "Sick" | "Paid" | "Unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Leave {
  id: string;
  userId: string;
  type: LeaveType;
  from: string; // YYYY-MM-DD
  to: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}
