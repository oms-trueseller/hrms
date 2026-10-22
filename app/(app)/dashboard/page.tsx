"use client";

import Link from "next/link";
import { useMemo } from "react";
import DayTable from "@/components/DayTable";
import { PageHeader, Stat } from "@/components/ui";
import {
  activeSession,
  buildMonth,
  endBreak,
  onBreak,
  punchIn,
  punchOut,
  startBreak,
  useAttendance,
  workedMs,
  breakMs,
  FULL_DAY_MS,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useLeaves } from "@/lib/leaves";
import { dateKey, formatClock, formatHM, formatTime, monthKey, parseKey, useNow } from "@/lib/time";

export default function Dashboard() {
  const { user } = useAuth();
  const { sessions } = useAttendance();
  const { leaves } = useLeaves();
  const mine = useMemo(() => sessions.filter((s) => s.userId === user?.id), [sessions, user?.id]);
  const myLeaves = useMemo(() => leaves.filter((l) => l.userId === user?.id), [leaves, user?.id]);

  const active = user ? activeSession(sessions, user.id) : undefined;
  const now = useNow();
  if (!user) return null;

  const today = dateKey(now);
  const todaySessions = mine.filter((s) => s.date === today);
  const todayMs = todaySessions.reduce((n, s) => n + workedMs(s, now), 0);
  const todayBreak = todaySessions.reduce((n, s) => n + breakMs(s, now), 0);
  const breaking = !!active && onBreak(active);

  // Week (Mon–Sun) total and month attendance.
  const d = parseKey(today);
  const weekStart = dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
  const weekMs = mine.filter((s) => s.date >= weekStart).reduce((n, s) => n + workedMs(s, now), 0);
  const monthRows = buildMonth(monthKey(now), mine, myLeaves, now);
  const presentDays = monthRows.filter((r) => r.status === "Present" || r.status === "Working").length;
  const pending = myLeaves.filter((l) => l.status === "pending").length;

  const recent = buildMonth(monthKey(now), mine, myLeaves, now).slice(0, 7);
  const progress = Math.min(100, (todayMs / FULL_DAY_MS) * 100);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={new Date(now).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
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
          {formatHM(todayMs)} of 8h target · breaks {formatHM(todayBreak)}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {!active ? (
            <button className="btn btn-primary px-8 py-3 text-base" onClick={() => punchIn(user.id)}>
              Punch in
            </button>
          ) : (
            <>
              <button className="btn btn-danger px-8 py-3 text-base" onClick={() => punchOut(user.id)}>
                Punch out
              </button>
              <button
                className="btn px-6 py-3 text-base"
                onClick={() => (breaking ? endBreak(user.id) : startBreak(user.id))}
              >
                {breaking ? "End break" : "Start break"}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today" value={formatHM(todayMs)} hint={`${todaySessions.length} session(s)`} />
        <Stat label="This week" value={formatHM(weekMs)} />
        <Stat label="Days present (month)" value={String(presentDays)} />
        <Stat label="Pending leave requests" value={String(pending)} />
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
