"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DayTable from "@/components/DayTable";
import PunchCard from "@/components/PunchCard";
import { IconCalendar, IconTarget, IconTimer, IconTrend } from "@/components/icons";
import { PageHeader, SectionTitle, Stat } from "@/components/ui";
import {
  activeSession,
  buildMonth,
  attendanceAction,
  onBreak,
  useAttendance,
  workedMs,
  breakMs,
  summarizeMonth,
  activeReasons,
  BREAK_REASON_MS,
} from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useLeaveSpans } from "@/lib/leaves";
import { ApiError, errorMessage, refresh } from "@/lib/api";
import ReasonDialog from "@/components/ReasonDialog";
import { dateKey, formatDelta, formatHM, formatLongDate, formatTime, hourIST, monthKey, addDays, weekday, useNow } from "@/lib/time";

export default function Dashboard() {
  const { user } = useAuth();
  const now = useNow();
  const today = dateKey(now);
  const weekStart = addDays(today, -((weekday(today) + 6) % 7)); // Monday
  const monthStart = `${monthKey(now)}-01`;
  // Re-checked every 30s so a break started by the server (the 1 pm auto break) or by an admin shows up by itself.
  const { sessions: mine } = useAttendance(
    {
      from: weekStart < monthStart ? weekStart : monthStart,
      to: today,
    },
    30_000,
  );
  const myLeaves = useLeaveSpans();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set while the "why was the break long?" dialog is open.
  const [ask, setAsk] = useState<"endBreak" | "punchOut" | null>(null);

  // The 1:00 pm break starts on the server. If this page is already open when the time passes, reload
  // the attendance so the break shows up straight away instead of waiting for the next refresh.
  // Check a few seconds after 1:00 pm: this computer's clock can be slightly ahead of the server's.
  const afterAutoBreak = hourIST(now - 5_000) >= 13;
  useEffect(() => {
    if (afterAutoBreak) refresh("/api/attendance");
  }, [afterAutoBreak]);

  if (!user) return null;
  const active = activeSession(mine, user.id);

  /** Runs a punch/break action. Ending a long break asks for a reason first. */
  async function act(a: Parameters<typeof attendanceAction>[0]) {
    const endsBreak = a === "endBreak" || (a === "punchOut" && !!active && onBreak(active));
    if (endsBreak && todayBreak > BREAK_REASON_MS && (a === "endBreak" || a === "punchOut")) return setAsk(a);
    setBusy(true);
    setError(null);
    try {
      await attendanceAction(a);
    } catch (e) {
      // The server may judge the break slightly longer than the screen did.
      if (e instanceof ApiError && e.code === "REASON_REQUIRED" && (a === "endBreak" || a === "punchOut")) setAsk(a);
      else setError(errorMessage(e));
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

  const recent = buildMonth(monthKey(now), mine, myLeaves, now).slice(0, 7);
  const hour = hourIST(now);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={formatLongDate(now)}
      />

      <PunchCard
        state={!active ? "out" : breaking ? "break" : "working"}
        since={active ? formatTime(active.punchIn) : undefined}
        breakSince={active?.breakStart ? formatTime(active.breakStart) : undefined}
        breakAuto={active?.breakAuto}
        autoBreakNote={!afterAutoBreak ? "A break starts automatically at 1:00 pm. Tap End break when you are back." : undefined}
        workedMs={todayMs}
        breakMs={todayBreak}
        busy={busy}
        error={error}
        reasons={activeReasons(todaySessions, now)}
        onAction={act}
      />
      {ask && (
        <ReasonDialog
          totalMs={todayBreak}
          confirmLabel={ask === "punchOut" ? "Punch out" : "End break"}
          onSubmit={async (reason) => {
            await attendanceAction(ask, undefined, reason);
            setAsk(null);
          }}
          onClose={() => setAsk(null)}
        />
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today" value={formatHM(todayMs)} hint={`${todaySessions.length} session(s)`} icon={<IconTimer />} color="sky" />
        <Stat label="This week" value={formatHM(weekMs)} icon={<IconCalendar />} color="cyan" />
        <Stat
          label="This month"
          value={formatHM(month.workedMs)}
          hint={`of 176h · ${formatHM(month.remainingMs)} to go`}
          icon={<IconTarget />}
          color={month.remainingMs === 0 ? "emerald" : "blue"}
        />
        <Stat
          label="Month balance"
          value={formatDelta(month.balanceMs)}
          hint="vs 8h on each completed working day"
          icon={<IconTrend />}
          color={month.balanceMs >= 0 ? "emerald" : "rose"}
          tone={month.balanceMs > 0 ? "good" : month.balanceMs < 0 ? "bad" : undefined}
        />
      </section>

      <section className="card p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <SectionTitle>Recent days</SectionTitle>
          <Link href="/history" className="text-sm font-medium text-accent">
            Full history →
          </Link>
        </div>
        <DayTable rows={recent} now={now} />
      </section>
    </>
  );
}
