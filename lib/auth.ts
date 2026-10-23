"use client";

import useSWR, { mutate } from "swr";
import { api, errorMessage, refresh } from "./api";
import type { Role, User, UserListItem } from "./types";

const ME = "/api/auth/me";

export function useAuth() {
  const { data, isLoading } = useSWR<{ user: User | null }>(ME, api);
  return { ready: !isLoading, user: data?.user ?? null };
}

/** All employees (admin only). Polls so live-status pages stay fresh. */
export function useUsers(refreshInterval = 0) {
  const { data } = useSWR<{ users: UserListItem[] }>("/api/users", api, { refreshInterval });
  return data?.users ?? [];
}

async function authenticate(path: string, body: unknown): Promise<string | null> {
  try {
    const { user } = await api<{ user: User }>(path, { method: "POST", body });
    await mutate(ME, { user }, { revalidate: false });
    return null;
  } catch (e) {
    return errorMessage(e);
  }
}

export const signup = (input: {
  name: string;
  email: string;
  password: string;
  department: string;
  designation: string;
}) => authenticate("/api/auth/signup", input);

export const login = (email: string, password: string) => authenticate("/api/auth/login", { email, password });

export async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  // Drop every cached key so the next user never sees the previous user's data.
  await mutate(() => true, undefined, { revalidate: false });
  await mutate(ME, { user: null }, { revalidate: false });
}

export async function updateProfile(patch: Partial<Pick<User, "name" | "department" | "designation" | "phone">>) {
  const { user } = await api<{ user: User }>("/api/users/me", { method: "PATCH", body: patch });
  await mutate(ME, { user }, { revalidate: false });
}

export async function setRole(id: string, role: Role) {
  await api(`/api/users/${id}`, { method: "PATCH", body: { role } });
  await refresh("/api/users");
}
