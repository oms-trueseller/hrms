"use client";

import {
  KEYS,
  newId,
  readCollection,
  setSessionUserId,
  useCollection,
  useSessionUserId,
  writeCollection,
} from "./store";
import type { Role, User } from "./types";

// Demo-only hashing; real auth must happen server-side once a DB exists.
async function hash(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${email.toLowerCase()}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useAuth() {
  const id = useSessionUserId();
  const { items: users, ready } = useCollection<User>(KEYS.users);
  const user = id ? (users.find((u) => u.id === id) ?? null) : null;
  return { ready: ready && id !== undefined, user, users };
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  department: string;
  designation: string;
}): Promise<string | null> {
  const users = readCollection<User>(KEYS.users);
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) return "An account with this email already exists.";
  const user: User = {
    id: newId(),
    name: input.name.trim(),
    email,
    passwordHash: await hash(email, input.password),
    // The first account becomes the admin.
    role: users.length === 0 ? "admin" : "employee",
    department: input.department.trim(),
    designation: input.designation.trim(),
    phone: "",
    joinedAt: new Date().toISOString(),
  };
  writeCollection(KEYS.users, [...users, user]);
  setSessionUserId(user.id);
  return null;
}

export async function login(email: string, password: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  const user = readCollection<User>(KEYS.users).find((u) => u.email === e);
  if (!user || user.passwordHash !== (await hash(e, password))) return "Invalid email or password.";
  setSessionUserId(user.id);
  return null;
}

export function logout() {
  setSessionUserId(null);
}

export function updateUser(id: string, patch: Partial<Pick<User, "name" | "department" | "designation" | "phone" | "role">>) {
  writeCollection(
    KEYS.users,
    readCollection<User>(KEYS.users).map((u) => (u.id === id ? { ...u, ...patch } : u)),
  );
}

export function setRole(id: string, role: Role) {
  updateUser(id, { role });
}
