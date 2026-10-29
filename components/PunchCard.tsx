"use client";

import type { ReactNode } from "react";
import { BREAK_ALLOWED_MS, DAY_TARGET_MS } from "@/lib/attendance";
import { formatClock, formatHM, formatTime } from "@/lib/time";
import type { LongBreak } from "@/lib/types";

export type PunchAction = "punchIn" | "punchOut" | "startBreak" | "endBreak";

const PILL = {
  working: { text: "bg-sky-500/15 text-sky-700 dark:text-sky-300", dot: "bg-sky-500 animate-pulse" },
  break: { text: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500 animate-pulse" },
  out: { text: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-500" },
} as const;

const Icon = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    {d}
  </svg>
);
const PlayIcon = <Icon d={<path d="M6 4.5v11l9-5.5z" />} />;
const StopIcon = <Icon d={<rect x="5" y="5" width="10" height="10" rx="1.5" />} />;
const PauseIcon = <Icon d={<path d="M6 4h3v12H6zM11 4h3v12h-3z" />} />;

/** Slim progress bar with evenly spaced ticks and labels exactly under them. */
function Meter({ percent, fill, ticks }: { percent: number; fill: string; ticks: string[] }) {
  const last = ticks.length - 1;
  return (
    <div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-border/70">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${fill}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
        {ticks.slice(1, -1).map((_, i) => (
          <span key={i} className="absolute inset-y-0 w-px bg-surface/80" style={{ left: `${((i + 1) / last) * 100}%` }} />
        ))}
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] font-medium text-muted">
        {ticks.map((t, i) => (
          <span
            key={t}
            className="absolute whitespace-nowrap"
            style={{
              left: `${(i / last) * 100}%`,
              transform: i === 0 ? "none" : i === last ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Today's punch card: work clock + punch button on the left, break details + break button on the right. */
export default function PunchCard({
  state,
  since,
  breakSince,
  breakAuto,
  autoBreakNote,
  workedMs,
  breakMs,
  busy,
  error,
  reasons,
  onAction,
}: {
  state: "out" | "working" | "break";
  /** Punch-in time, formatted. */
  since?: string;
  /** Start of the running break, formatted. */
  breakSince?: string;
  /** The running break started by itself at the automatic break time. */
  breakAuto?: boolean;
  /** Shown under the break meter, e.g. when a break will start automatically. */
  autoBreakNote?: string;
  workedMs: number;
  breakMs: number;
  busy: boolean;
  error: string | null;
  /** Reasons given today for long breaks. */
  reasons?: LongBreak[];
  onAction: (a: PunchAction) => void;
}) {
  const clock = formatClock(workedMs);
  const left = Math.max(0, DAY_TARGET_MS - workedMs);
  const reached = left === 0;
  const overtime = Math.max(0, workedMs - DAY_TARGET_MS);
  const overBreak = breakMs > BREAK_ALLOWED_MS;
  const pill = PILL[state];
  const breakLeft = BREAK_ALLOWED_MS - breakMs;
  const big = "btn rounded-xl py-3 text-base w-full sm:w-auto sm:px-10";
  // The line along the top edge shows the state at a glance.
  const topLine =
    state === "break"
      ? "from-amber-500 to-amber-300"
      : state === "out"
        ? "from-zinc-600 to-zinc-500"
        : reached
          ? "from-emerald-500 to-emerald-300"
          : "from-sky-500 to-sky-300";

  return (
    <section
      className="card relative mb-6 overflow-hidden p-0"
      style={{
        backgroundImage:
          "radial-gradient(70% 90% at 0% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
      }}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r ${topLine}`} />
      <div className="grid md:grid-cols-[3fr_2fr]">
        {/* ── Work ─────────────────────────────── */}
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${pill.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
              {state === "working" ? `Working since ${since}` : state === "break" ? "On break" : "Not punched in"}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Today</span>
          </div>

          <p className="mt-6 font-mono font-semibold leading-none tabular-nums tracking-tight" aria-live="off">
            <span
              className={`text-6xl sm:text-7xl ${
                reached ? "text-emerald-500 dark:text-emerald-400" : state === "working" ? "text-accent" : ""
              }`}
            >{clock.slice(0, 5)}</span>
            <span className="text-3xl text-muted sm:text-4xl">{clock.slice(5)}</span>
          </p>
          <p className="mt-3 text-sm text-muted">
            {reached ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                8h target reached 🎉{overtime >= 60_000 && ` · +${formatHM(overtime)} overtime`}
              </span>
            ) : (
              <>
                <span className="font-medium text-foreground">{formatHM(left)}</span> left to reach 8h
              </>
            )}
          </p>

          <div className="mt-6">
            <Meter
              percent={(workedMs / DAY_TARGET_MS) * 100}
              fill={reached ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-gradient-to-r from-sky-500 to-cyan-300"}
              ticks={["0h", "2h", "4h", "6h", "8h"]}
            />
          </div>

          <div className="mt-auto pt-7">
            {state === "out" ? (
              <button disabled={busy} className={`${big} btn-primary`} onClick={() => onAction("punchIn")}>
                {PlayIcon} Punch in
              </button>
            ) : (
              <button disabled={busy} className={`${big} btn-danger`} onClick={() => onAction("punchOut")}>
                {StopIcon} Punch out
              </button>
            )}
          </div>
        </div>

        {/* ── Break ────────────────────────────── */}
        <div className="flex flex-col border-t border-border bg-background/40 p-6 sm:p-8 md:border-l md:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Break</span>
            {state === "break" && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {breakAuto ? `auto-started ${breakSince}` : `since ${breakSince}`}
              </span>
            )}
          </div>

          {/* The clock and bar only appear while a break is running. */}
          {state === "break" && (
          <div>
            <p
              className={`mt-6 font-mono text-4xl font-semibold leading-none tabular-nums tracking-tight sm:text-5xl ${
                overBreak ? "text-rose-500" : "text-amber-500"
              }`}
              aria-live="off"
            >
              {formatClock(breakMs)}
            </p>
            <p className="mt-3 text-sm text-muted">
              {overBreak ? (
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {formatHM(breakMs - BREAK_ALLOWED_MS)} over · not counted as work
                </span>
              ) : (
                <>
                  <span className="font-medium text-foreground">{formatHM(breakLeft)}</span> of {formatHM(BREAK_ALLOWED_MS)} left
                </>
              )}
            </p>

            <div className="mt-6">
              <Meter
                percent={(breakMs / BREAK_ALLOWED_MS) * 100}
                fill={overBreak ? "bg-gradient-to-r from-rose-500 to-orange-400" : "bg-gradient-to-r from-amber-500 to-yellow-300"}
                ticks={["0m", "30m", "1h"]}
              />
            </div>
          </div>
          )}

          {/* Not on a break: a compact summary of today's break against the allowance. */}
          {state !== "break" && (
            <div className={`mt-6 rounded-xl border border-border bg-surface/60 p-4 ${state === "out" ? "opacity-60" : ""}`}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted">Taken today</p>
                  <p className="mt-1 text-3xl font-semibold leading-none tabular-nums tracking-tight">{formatHM(breakMs)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    overBreak
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {overBreak ? "Limit reached" : `${formatHM(breakLeft)} left`}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/70">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${overBreak ? "bg-gradient-to-r from-rose-500 to-orange-400" : "bg-gradient-to-r from-amber-500 to-yellow-300"}`}
                  style={{ width: `${Math.min(100, (breakMs / BREAK_ALLOWED_MS) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {formatHM(BREAK_ALLOWED_MS)} allowed per day
                {overBreak && ` · ${formatHM(breakMs - BREAK_ALLOWED_MS)} over, not counted as work`}
              </p>
            </div>
          )}

          {autoBreakNote && state === "working" && (
            <p className="mt-4 flex items-start gap-2 text-xs text-muted">
              <span aria-hidden="true">⏰</span>
              <span>{autoBreakNote}</span>
            </p>
          )}

          {reasons && reasons.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {reasons.map((r) => (
                <li
                  key={r.at}
                  className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
                >
                  <span className="font-medium">Reason ({formatTime(r.at)}):</span> {r.reason}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto pt-7">
            {state === "out" ? (
              <p className="text-center text-sm text-muted sm:text-left">Punch in to start a break.</p>
            ) : (
              <button
                disabled={busy}
                className={`${big} ${state === "break" ? "btn-primary" : ""}`}
                onClick={() => onAction(state === "break" ? "endBreak" : "startBreak")}
              >
                {state === "break" ? <>{PlayIcon} End break</> : <>{PauseIcon} Start break</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-t border-border bg-red-500/10 px-6 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
