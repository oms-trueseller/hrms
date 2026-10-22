"use client";

import Link from "next/link";
import { useState } from "react";
import DayTable from "@/components/DayTable";
import { PageHeader, Stat } from "@/components/ui";
import {
  activeSession,
  buildMonth,
  attendanceAction,
  onBreak,
  useAttendance,
  workedMs,
  breakMs,
  summarizeMonth,
  BREAK_ALLOWED_MS,
  DAY_TARGET_MS,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useLeaves } from "@/lib/leaves";
import { errorMessage } from "@/lib/api";
import { dateKey, formatClock, formatDelta, formatHM, formatLongDate, formatTime, hourIST, monthKey, addDays, weekday, useNow } from "@/lib/time";

export default function Dashboard() {
  const { user } = useAuth();
  const now = useNow();
  const today = dateKey(now);
  const weekStart = addDays(today, -((weekday(today) + 6) % 7)); // Monday
  const monthStart = `${monthKey(now)}-01`;
  const { sessions: mine } = useAttendance({
    from: weekStart < monthStart ? weekStart : monthStart,
    to: today,
  });
  const { leaves: myLeaves } = useLeaves();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const active = activeSession(mine, user.id);

  async function act(a: Parameters<typeof attendanceAction>[0]) {
    setBusy(true);
    setError(null);
    try {
      await attendanceAction(a);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const todaySessions = mine.filter((s) => s.date === today);
  const todayMs = todaySessions.reduce((n, s) => n + workedMs(s, now), 0);
  const todayBreak = todaySessions.reduce((n, s) => n + breakMs(s, now), 0);
  const breaking = !!active && onBreak(active);

  // Week (Mon–Sun) total and month attendance.
  const weekMs = mine.filter((s) => s.date >= weekStart).reduce((n, s) => n + workedMs(s, now), 0);
  const monthRows = buildMonth(monthKey(now), mine, myLeaves, now);
  const month = summarizeMonth(monthRows);
  const remaining = Math.max(0, DAY_TARGET_MS - todayMs);

  const recent = buildMonth(monthKey(now), mine, myLeaves, now).slice(0, 7);
  const progress = Math.min(100, (todayMs / DAY_TARGET_MS) * 100);
  const hour = hourIST(now);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={formatLongDate(now)}
      />

      <section className="card mb-6 flex flex-col items-center gap-5 py-8 text-center">
        <p className="text-sm font-medium text-muted">
          {active
            ? breaking
              ? "On break"
              : `Working since ${formatTime(active.punchIn)}`
            : "You are punched out"}
        </p>
        <p
          className={`font-mono text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl ${
            active && !breaking ? "text-accent" : ""
          }`}
          aria-live="off"
        >
          {formatClock(todayMs)}
        </p>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="-mt-3 text-xs text-muted">
          {formatHM(todayMs)} of 8h worked
          {remaining > 0 ? ` · ${formatHM(remaining)} left` : " · target reached"}
        </p>
        <p className={`-mt-3 text-xs ${todayBreak > BREAK_ALLOWED_MS ? "font-medium text-amber-600" : "text-muted"}`}>
          Break {formatHM(todayBreak)} of {formatHM(BREAK_ALLOWED_MS)} allowed
          {todayBreak > BREAK_ALLOWED_MS && " · over the limit, extra break time is not counted as work"}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {!active ? (
            <button disabled={busy} className="btn btn-primary px-8 py-3 text-base" onClick={() => act("punchIn")}>
              Punch in
            </button>
          ) : (
            <>
              <button disabled={busy} className="btn btn-danger px-8 py-3 text-base" onClick={() => act("punchOut")}>
                Punch out
              </button>
              <button
                disabled={busy}
                className="btn px-6 py-3 text-base"
                onClick={() => act(breaking ? "endBreak" : "startBreak")}
              >
                {breaking ? "End break" : "Start break"}
              </button>
            </>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today" value={formatHM(todayMs)} hint={`${todaySessions.length} session(s)`} />
        <Stat label="This week" value={formatHM(weekMs)} />
        <Stat label="This month" value={formatHM(month.workedMs)} hint={`of 176h · ${formatHM(month.remainingMs)} to go`} />
        <Stat label="Month balance" value={formatDelta(month.balanceMs)} hint="vs 8h on each completed working day" />
      </section>

      <section className="card p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold">Recent days</h2>
          <Link href="/history" className="text-sm font-medium text-accent">
            Full history →
          </Link>
        </div>
        <DayTable rows={recent} now={now} />
      </section>
    </>
  );
}
