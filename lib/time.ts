import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local YYYY-MM-DD. */
export function dateKey(d: Date | number | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function monthKey(d: Date | number | string): string {
  return dateKey(d).slice(0, 7);
}

/** Parse YYYY-MM-DD as a local date. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(key: string): string {
  return parseKey(key).toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ticks every second; returns the current epoch ms. */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
