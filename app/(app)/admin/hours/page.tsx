"use client";

import { useMemo, useState } from "react";
import AdminOnly from "@/components/AdminOnly";
import EmployeeDetail from "@/components/EmployeeDetail";
import { IconBriefcase, IconPlus, IconTarget, IconUsers } from "@/components/icons";
import { PageHeader, Stat } from "@/components/ui";
import {
  buildMonth,
  liveOvertimeMs,
  MONTH_TARGET_MS,
  summarizeMonth,
  useAttendance,
  workedByDate,
} from "@/lib/attendance";
import { useUsers } from "@/lib/auth";
import { countLeaves, useLeaveSpans } from "@/lib/leaves";
import { dateKey, formatDelta, formatHM, monthKey, SLOW_TICK, useNow } from "@/lib/time";
import type { UserListItem } from "@/lib/types";

type Sort = "name" | "worked" | "ot";

/** Admin-only: every employee's hours for a month, with overtime and shortfall. */
export default function MonthlyHoursPage() {
  const now = useNow(true, SLOW_TICK); // hours are shown to the minute, so redraw rarely
  const users = useUsers();
  const leaves = useLeaveSpans(true);
  const [month, setMonth] = useState(() => monthKey(Date.now()));
  const [sort, setSort] = useState<Sort>("name");
  const [detail, setDetail] = useState<UserListItem | null>(null);
  const { sessions } = useAttendance({ from: `${month}-01`, to: `${month}-31`, userId: "all" }, 30_000);

  const rows = useMemo(() => {
    const list = users.map((u) => {
      const mine = sessions.filter((s) => s.userId === u.id);
      const theirLeaves = leaves.filter((l) => l.userId === u.id);
      const days = buildMonth(month, mine, theirLeaves, now);
      const leave = countLeaves(theirLeaves, `${month}-01`, `${month}-31`, dateKey(now), workedByDate(mine));
      const sum = summarizeMonth(days);
      // Today's overtime counts as it happens, so a person still working past 8h shows up straight away.
      const ot = sum.extraMs + liveOvertimeMs(days, now);
      return { user: u, sum, ot, leave, left: Math.max(0, MONTH_TARGET_MS - sum.workedMs) };
    });
    return list.sort((a, b) =>
      sort === "worked" ? b.sum.workedMs - a.sum.workedMs : sort === "ot" ? b.ot - a.ot : a.user.name.localeCompare(b.user.name),
    );
  }, [users, sessions, leaves, month, now, sort]);

  const total = rows.reduce(
    (t, r) => ({ worked: t.worked + r.sum.workedMs, ot: t.ot + r.ot, days: t.days + r.sum.daysWorked }),
    { worked: 0, ot: 0, days: 0 },
  );
  const withOt = rows.filter((r) => r.ot > 0).length;

  function exportCsv() {
    const min = (ms: number) => Math.round(ms / 60000);
    const lines = [
      "Employee,Email,Days done,Leave days,Worked (min),Left to 176h (min),Overtime (min),Short (min),Net (min)",
      ...rows.map((r) =>
        [
          `"${r.user.name.replace(/"/g, '""')}"`,
          r.user.email,
          r.sum.daysWorked,
          r.leave.taken,
          min(r.sum.workedMs),
          min(r.left),
          min(r.ot),
          min(r.sum.shortMs),
          min(r.sum.balanceMs),
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `hours-${month}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminOnly>
      <PageHeader
        title="Monthly hours"
        subtitle="Every employee's working hours and overtime. Click a name for the full picture."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto" aria-label="Sort by">
              <option value="name">Sort: name</option>
              <option value="worked">Sort: hours worked</option>
              <option value="ot">Sort: overtime</option>
            </select>
            <input
              type="month"
              value={month}
              max={monthKey(now)}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="input w-auto"
              aria-label="Month"
            />
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Employees" value={String(rows.length)} hint={`${total.days} days done in total`} icon={<IconUsers />} color="sky" />
        <Stat label="Total hours worked" value={formatHM(total.worked)} hint="all employees, breaks excluded" icon={<IconBriefcase />} color="cyan" />
        <Stat
          label="Total overtime"
          value={total.ot ? `+${formatHM(total.ot)}` : "0h 00m"}
          hint={`${withOt} ${withOt === 1 ? "employee" : "employees"} with overtime`}
          icon={<IconPlus />}
          color={total.ot ? "emerald" : "slate"}
          tone={total.ot ? "good" : undefined}
        />
        <Stat
          label="Average per employee"
          value={formatHM(rows.length ? total.worked / rows.length : 0)}
          hint="of 176h target"
          icon={<IconTarget />}
          color="blue"
        />
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-border bg-foreground/[0.04]">
            <tr>
              <th className="th">Employee</th>
              <th className="th">Days done</th>
              <th className="th">Leave days</th>
              <th className="th">Hours worked</th>
              <th className="th w-48">Progress to 176h</th>
              <th className="th">Hours left</th>
              <th className="th">Overtime</th>
              <th className="th">Short</th>
              <th className="th">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted">No employees yet.</td>
              </tr>
            )}
            {rows.map(({ user: u, sum, ot, leave, left }) => {
              const pct = Math.min(100, (sum.workedMs / MONTH_TARGET_MS) * 100);
              return (
                <tr key={u.id}>
                  <td className="td">
                    <button className="text-left" onClick={() => setDetail(u)} title="Open shift details">
                      <p className="font-medium underline-offset-2 hover:text-accent hover:underline">{u.name}</p>
                      <p className="text-xs text-muted">{u.department || u.email}</p>
                    </button>
                  </td>
                  <td className="td tabular-nums">{sum.daysWorked}</td>
                  <td className="td">
                    {leave.taken ? (
                      <>
                        <p className="font-medium tabular-nums">
                          {leave.taken} <span className="text-xs font-normal text-muted">{leave.taken === 1 ? "day" : "days"}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {Object.entries(leave.byType)
                            .map(([t, n]) => `${t} ${n}`)
                            .join(" · ")}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {leave.upcoming > 0 && <p className="text-[11px] text-sky-600 dark:text-sky-400">+{leave.upcoming} coming up</p>}
                    {leave.returned > 0 && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{leave.returned} worked in full</p>}
                  </td>
                  <td className="td font-medium tabular-nums">{formatHM(sum.workedMs)}</td>
                  <td className="td">
                    <div className="h-2 overflow-hidden rounded-full bg-border/70">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-gradient-to-r from-sky-500 to-cyan-300"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{Math.round(pct)}%</p>
                  </td>
                  <td className="td tabular-nums">{left ? formatHM(left) : <span className="text-emerald-600 dark:text-emerald-400">Done</span>}</td>
                  <td className="td tabular-nums">
                    {ot ? <span className="font-medium text-emerald-600 dark:text-emerald-400">+{formatHM(ot)}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="td tabular-nums">
                    {sum.shortMs ? <span className="text-rose-600 dark:text-rose-400">{formatHM(sum.shortMs)}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="td tabular-nums">
                    <span
                      className={
                        sum.balanceMs > 0
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : sum.balanceMs < 0
                            ? "font-medium text-rose-600 dark:text-rose-400"
                            : "text-muted"
                      }
                    >
                      {formatDelta(sum.balanceMs)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-border px-4 py-3 text-xs text-muted">
          Hours are time on site minus breaks. Overtime is every hour beyond 8h in a day (weekend work counts fully), including
          today&apos;s while someone is still working. Short time counts days under 8h and absent working days.
        </p>
      </section>

      {detail && <EmployeeDetail employee={detail} onClose={() => setDetail(null)} />}
    </AdminOnly>
  );
}
