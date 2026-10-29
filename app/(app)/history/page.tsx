"use client";

import { useMemo, useState } from "react";
import DayTable from "@/components/DayTable";
import { IconBriefcase, IconMinus, IconPlus, IconTrend } from "@/components/icons";
import { PageHeader, Stat } from "@/components/ui";
import EntryDialog from "@/components/EntryDialog";
import { buildMonth, deleteEntry, summarizeMonth, useAttendance } from "@/lib/attendance";
import { errorMessage } from "@/lib/api";
import type { Session } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLeaveSpans } from "@/lib/leaves";
import { dateKey, formatDelta, formatHM, formatTime, monthKey, useNow } from "@/lib/time";

// Set to true to show the "+ Add / update entry" button for backfilling past days.
const SHOW_ADD_ENTRY = false;
// Employees can edit/add only today's entry (or close a session left running from an earlier day);
// other dates are changed by an admin from the All attendance page.
const SHOW_EDIT = true;
// Set to true to also show Delete next to Edit.
const SHOW_DELETE = false;

export default function HistoryPage() {
  const { user } = useAuth();
  const now = useNow();
  const [month, setMonth] = useState(() => monthKey(Date.now()));
  const { sessions } = useAttendance({ from: `${month}-01`, to: `${month}-31` });
  const leaves = useLeaveSpans();
  // null = closed; otherwise the date to prefill, plus the session when editing.
  const [dialog, setDialog] = useState<{ date: string; session?: Session } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => buildMonth(month, sessions, leaves, now), [month, sessions, leaves, now]);
  const sum = useMemo(() => summarizeMonth(rows), [rows]);
  if (!user) return null;

  const today = dateKey(now);
  const pct = Math.min(100, (sum.workedMs / sum.targetMs) * 100);

  function exportCsv() {
    const min = (ms: number) => Math.round(ms / 60000);
    const lines = [
      "Date,First in,Last out,On site (min),Break (min),Break over limit (min),Worked net (min),vs 8h (min),Status",
      ...rows.map((r) =>
        [
          r.date,
          r.firstIn ? formatTime(r.firstIn) : "",
          r.lastOut ? formatTime(r.lastOut) : "",
          min(r.grossMs),
          min(r.breakMs),
          min(r.breakOverMs),
          min(r.workedMs),
          r.deltaMs === null ? "" : min(r.deltaMs),
          r.status,
        ].join(","),
      ),
      `Total,,,${min(sum.grossMs)},${min(sum.breakMs)},${min(sum.breakOverMs)},${min(sum.workedMs)},${min(sum.balanceMs)},`,
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `attendance-${month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Attendance history"
        subtitle="Day-by-day record. Click a row to see each punch session."
        action={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              max={monthKey(now)}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="input w-auto"
              aria-label="Month"
            />
            <button className="btn" onClick={exportCsv}>Export CSV</button>
            {SHOW_ADD_ENTRY && (
              <button className="btn btn-primary" onClick={() => setDialog({ date: today })}>
                + Add / update entry
              </button>
            )}
          </div>
        }
      />

      <section className="card mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-muted">Monthly working hours (breaks excluded)</p>
          <p className="text-sm text-muted">Target 176h · {formatHM(sum.remainingMs)} to go</p>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-3xl font-semibold tabular-nums">
            {formatHM(sum.workedMs)} <span className="text-base font-normal text-muted">of 176h</span>
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {sum.daysWorked} <span className="text-base font-normal text-muted">{sum.daysWorked === 1 ? "day" : "days"} done</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-gradient-to-r from-sky-500 to-cyan-300"}`} style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total working hours"
          icon={<IconBriefcase />}
          color="sky"
          value={formatHM(sum.workedMs)}
          hint={`${formatHM(sum.expectedSoFarMs)} expected ${sum.balanceMs < 0 ? "−" : "+"} ${formatHM(Math.abs(sum.balanceMs))} net`}
        />
        <Stat label="Extra time" value={formatHM(sum.extraMs)} hint="Worked beyond 8h on a day" icon={<IconPlus />} color="emerald" tone={sum.extraMs > 0 ? "good" : undefined} />
        <Stat
          label="Short time"
          icon={<IconMinus />}
          color="rose"
          tone={sum.shortMs > 0 ? "bad" : undefined}
          value={formatHM(sum.shortMs)}
          hint={sum.absentDays ? `Includes ${sum.absentDays} absent day(s) × 8h` : "Worked under 8h on a day"}
        />
        <Stat
          label="Net extra / short"
          icon={<IconTrend />}
          color={sum.balanceMs >= 0 ? "emerald" : "rose"}
          tone={sum.balanceMs > 0 ? "good" : sum.balanceMs < 0 ? "bad" : undefined}
          value={formatDelta(sum.balanceMs)}
          hint={`${formatHM(sum.extraMs)} extra − ${formatHM(sum.shortMs)} short`}
        />
      </section>

      <section className="card p-0">
        {deleteError && <p role="alert" className="px-4 pt-3 text-sm text-red-600">{deleteError}</p>}
        <DayTable
          rows={rows}
          now={now}
          onAdd={SHOW_EDIT ? (r) => setDialog({ date: r.date }) : undefined}
          canAdd={(r) => r.date === today}
          onEdit={SHOW_EDIT ? (session) => setDialog({ date: session.date, session }) : undefined}
          canEdit={(s) => s.date === today || !s.punchOut}
          onDelete={
            SHOW_DELETE
              ? async (s) => {
                  setDeleteError(null);
                  try {
                    await deleteEntry(s.id);
                  } catch (e) {
                    setDeleteError(errorMessage(e));
                  }
                }
              : undefined
          }
        />
        <p className="border-t border-border px-4 py-3 text-xs text-muted">
          Worked = time on site minus breaks. Target is 8h worked per weekday (Sat/Sun and approved leave excluded);
          up to 1h break is allowed, any extra break time reduces worked hours. Taking less than 1h break is fine.
        </p>
      </section>
      {dialog && (
        <EntryDialog
          key={`${dialog.date}-${dialog.session?.id ?? "new"}`}
          date={dialog.date}
          session={dialog.session}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
