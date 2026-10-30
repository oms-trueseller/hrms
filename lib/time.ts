import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The whole app runs on Indian Standard Time (UTC+05:30, no DST), whatever the device's
 * time zone is. Instants are stored/sent as UTC ISO strings; "days" are IST calendar days.
 */
export const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 3600_000;

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function dateKey(d: Date | number | string): string {
  const x = new Date(new Date(d).getTime() + IST_OFFSET_MS);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

export function monthKey(d: Date | number | string): string {
  return dateKey(d).slice(0, 7);
}

/** A calendar date (YYYY-MM-DD) as a Date at UTC midnight. Read it with the getUTC* methods. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Day of week of a calendar date: 0 = Sunday … 6 = Saturday. */
export const weekday = (key: string) => parseKey(key).getUTCDay();

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Number of days in a month (YYYY-MM). */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Hour of day (0–23) in IST. */
export const hourIST = (ms: number) => new Date(ms + IST_OFFSET_MS).getUTCHours();

/** "HH:MM" (24h, IST) of an instant, for time inputs. */
export function toHHMM(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** The instant for an IST date + "HH:MM" as typed by the user. */
export const fromIST = (date: string, hhmm: string): Date => new Date(`${date}T${hhmm}:00+05:30`);

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function formatHM(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

/** Signed difference, e.g. "+0h 20m", "−1h 05m", or "On target". */
export function formatDelta(ms: number): string {
  if (Math.abs(ms) < 60_000) return "On target";
  return `${ms > 0 ? "+" : "−"}${formatHM(Math.abs(ms))}`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(key: string): string {
  return parseKey(key).toLocaleDateString("en-IN", {
    timeZone: "UTC", // key is already a calendar date; avoid shifting it
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "Thursday, 22 October 2026" for the current IST day. */
export function formatLongDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** For pages that show times to the minute only: refresh every 30 s instead of every second. */
export const SLOW_TICK = 30_000;

/**
 * The current epoch ms, refreshed every `intervalMs` (1 s by default). Every refresh re-draws the page that
 * uses it, so pages with big tables and no seconds clock should pass a longer interval (see `SLOW_TICK`).
 */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
