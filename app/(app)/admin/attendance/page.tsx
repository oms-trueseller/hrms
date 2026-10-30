"use client";

import { useMemo, useState } from "react";
import AdminOnly from "@/components/AdminOnly";
import DayTable from "@/components/DayTable";
import EntryDialog from "@/components/EntryDialog";
import { PageHeader } from "@/components/ui";
import { summarizeDay, useAttendance, type DaySummary } from "@/lib/attendance";
import { useUsers } from "@/lib/auth";
import { useLeaveSpans } from "@/lib/leaves";
import { addDays, dateKey, monthKey, parseKey, useNow, weekday } from "@/lib/time";
import type { LeaveSpan, Session } from "@/lib/types";

/** The longest range shown at once (every employee x every day is a lot of rows). */
const MAX_DAYS = 62;

const daysBetween = (from: string, to: string) =>
  Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86400000) + 1;

/** Everyone's attendance between two dates (today by default). Admin only. */
export default function AllAttendancePage() {
  const users = useUsers();
  const now = useNow();
  const today = dateKey(now);
  const [from, setFrom] = useState(() => dateKey(Date.now()));
  const [to, setTo] = useState(() => dateKey(Date.now()));
  const [employee, setEmployee] = useState("all");
  // Entry being added (no session) or edited, for one employee on one date.
  const [dialog, setDialog] = useState<{ userId: string; date: string; session?: Session } | null>(null);

  // A very long range is cut to its most recent days.
  const tooLong = daysBetween(from, to) > MAX_DAYS;
  const first = tooLong ? addDays(to, -(MAX_DAYS - 1)) : from;

  const { sessions } = useAttendance({ from: first, to, userId: employee });
  const leaves = useLeaveSpans(true);
  const names = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const people = useMemo(
    () => users.filter((u) => employee === "all" || u.id === employee).sort((a, b) => a.name.localeCompare(b.name)),
    [users, employee],
  );

  // One row per employee per day (including people who were absent), newest day first.
  const rows = useMemo<DaySummary[]>(() => {
    const bySlot = new Map<string, Session[]>();
    for (const s of sessions) {
      const k = `${s.userId}|${s.date}`;
      bySlot.set(k, [...(bySlot.get(k) ?? []), s]);
    }
    const leavesBy = new Map<string, LeaveSpan[]>();
    for (const l of leaves) if (l.userId) leavesBy.set(l.userId, [...(leavesBy.get(l.userId) ?? []), l]);

    const out: DaySummary[] = [];
    for (let d = to; d >= first; d = addDays(d, -1)) {
      for (const u of people) {
        out.push(summarizeDay(d, bySlot.get(`${u.id}|${d}`) ?? [], leavesBy.get(u.id) ?? [], now, u.id));
      }
    }
    return out;
  }, [sessions, leaves, people, first, to, now]);

  function changeFrom(v: string) {
    if (!v) return;
    setFrom(v);
    if (v > to) setTo(v); // keep the range valid
  }
  function changeTo(v: string) {
    if (!v) return;
    setTo(v);
    if (v < from) setFrom(v);
  }
  const preset = (a: string, b: string) => () => {
    setFrom(a);
    setTo(b);
  };
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const isRange = (a: string, b: string) => from === a && to === b;
  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted hover:bg-foreground/5 hover:text-foreground"
    }`;

  const days = daysBetween(first, to);

  return (
    <AdminOnly>
      <PageHeader
        title="All attendance"
        subtitle="Everyone's attendance between two dates (today by default). Admins can add or correct any entry."
      />

      <div className="card mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div>
          <label className="label" htmlFor="att-from">From</label>
          <input id="att-from" type="date" value={from} max={today} onChange={(e) => changeFrom(e.target.value)} className="input w-auto" />
        </div>
        <div>
          <label className="label" htmlFor="att-to">To</label>
          <input id="att-to" type="date" value={to} min={from} max={today} onChange={(e) => changeTo(e.target.value)} className="input w-auto" />
        </div>
        <div>
          <label className="label" htmlFor="att-emp">Employee</label>
          <select id="att-emp" value={employee} onChange={(e) => setEmployee(e.target.value)} className="input w-auto">
            <option value="all">All employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button className={chip(isRange(today, today))} onClick={preset(today, today)}>Today</button>
          <button className={chip(isRange(addDays(today, -1), addDays(today, -1)))} onClick={preset(addDays(today, -1), addDays(today, -1))}>
            Yesterday
          </button>
          <button className={chip(isRange(monday, today))} onClick={preset(monday, today)}>This week</button>
          <button className={chip(isRange(`${monthKey(now)}-01`, today))} onClick={preset(`${monthKey(now)}-01`, today)}>This month</button>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted">
        {people.length} {people.length === 1 ? "employee" : "employees"} · {days} {days === 1 ? "day" : "days"} · {rows.length} rows
        {tooLong && ` · the range is longer than ${MAX_DAYS} days, so only the latest ${MAX_DAYS} are shown`}
      </p>

      <section className="card p-0">
        <DayTable
          rows={rows}
          now={now}
          showName
          names={names}
          onAdd={(r) => r.userId && setDialog({ userId: r.userId, date: r.date })}
          onEdit={(s) => setDialog({ userId: s.userId, date: s.date, session: s })}
        />
      </section>
      {dialog && (
        <EntryDialog
          key={`${dialog.date}-${dialog.userId}-${dialog.session?.id ?? "new"}`}
          date={dialog.date}
          session={dialog.session}
          userId={dialog.userId}
          who={names[dialog.userId]}
          onClose={() => setDialog(null)}
        />
      )}
    </AdminOnly>
  );
}
