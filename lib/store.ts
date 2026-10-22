"use client";

/**
 * Storage layer. Everything persists to localStorage for now.
 * To move to a real DB, replace readCollection / writeCollection / subscribe
 * (and the session helpers) with API calls — the rest of the app only uses these.
 */
import { useMemo, useSyncExternalStore } from "react";

export const KEYS = {
  users: "hrms.users",
  attendance: "hrms.attendance",
  leaves: "hrms.leaves",
  session: "hrms.session",
} as const;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readRaw(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function readCollection<T>(key: string): T[] {
  try {
    const raw = readRaw(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeCollection<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Reactive collection. `ready` is false during SSR/hydration. */
export function useCollection<T>(key: string): { items: T[]; ready: boolean } {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  return useMemo(() => {
    if (raw === null) return { items: [], ready: false };
    try {
      return { items: raw ? (JSON.parse(raw) as T[]) : [], ready: true };
    } catch {
      return { items: [], ready: true };
    }
  }, [raw]);
}

/** Id of the logged-in user (null if logged out, undefined while hydrating). */
export function useSessionUserId(): string | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(KEYS.session),
    () => null,
  );
  if (raw === null) return undefined;
  return raw || null;
}

export function setSessionUserId(id: string | null) {
  if (id) localStorage.setItem(KEYS.session, id);
  else localStorage.removeItem(KEYS.session);
  listeners.forEach((l) => l());
}
