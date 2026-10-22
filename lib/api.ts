"use client";

import { mutate } from "swr";

/** JSON fetch against our API; throws Error(message) on non-2xx. Also used as the SWR fetcher. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

/** Revalidate every cached key under a path prefix, e.g. "/api/attendance". */
export const refresh = (prefix: string) =>
  mutate((key) => typeof key === "string" && key.startsWith(prefix));

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
