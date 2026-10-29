"use client";

import { mutate } from "swr";

/** An API error. `code` is set when the server sends one (e.g. REASON_REQUIRED). */
export class ApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

/** JSON fetch against our API; throws ApiError on non-2xx. Also used as the SWR fetcher. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; code?: string };
    throw new ApiError(d.error ?? `Request failed (${res.status})`, d.code);
  }
  return data as T;
}

/** Revalidate every cached key under a path prefix, e.g. "/api/attendance". */
export const refresh = (prefix: string) =>
  mutate((key) => typeof key === "string" && key.startsWith(prefix));

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
