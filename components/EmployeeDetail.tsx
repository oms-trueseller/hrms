"use client";

import { useMemo } from "react";
import {
  BREAK_ALLOWED_MS,
  buildMonth,
  DAY_TARGET_MS,
  liveOvertimeMs,
  MONTH_TARGET_MS,
  onBreak,
  summarizeMonth,
  useAttendance,
  workedByDate,
  workedMs,
  breakMs,
} from "@/lib/attendance";
import { countLeaves, LEAVE_QUOTA, useLeaveSpans } from "@/lib/leaves";
import { dateKey, formatClock, formatDelta, formatHM, formatTime, monthKey, useNow } from "@/lib/time";
import type { UserListItem } from "@/lib/types";
import {
  IconBriefcase,
  IconCalendar,
  IconHeart,
  IconHistory,
  IconMinus,
  IconPlus,
  IconSun,
  IconTarget,
  IconTimer,
  IconTrend,
  IconWallet,
} from "./icons";
import { Badge, Stat } from "./ui";

/**
 * Admin-only panel for one employee: today's shift (done / left / overtime) and the month so far.
 * The data comes from admin-only endpoints, so a normal employee cannot load another person's numbers.
 */
export default function EmployeeDetail({ employee, onClose }: { employee: UserListItem; onClose: () => void }) {
  const now = useNow();
  const today = dateKey(now);
  const month = monthKey(now);
  const year = month.slice(0, 4);
  // The whole year, so leave days worked in full can be told apart from days really taken off.
  const { sessions } = useAttendance({ from: `${year}-01-01`, to: today, userId: employee.id }, 30_000);
  const leaves = useLeaveSpans(true);

  const mine = useMemo(() => leaves.filter((l) => l.userId === employee.id), [leaves, employee.id]);
  const rows = useMemo(() => buildMonth(month, sessions, mine, now), [month, sessions, mine, now]);
  const sum = summarizeMonth(rows);
  const workedMap = workedByDate(sessions);
  const monthLeave = countLeaves(mine, `${month}-01`, `${month}-31`, today, workedMap);
  const yearLeave = countLeaves(mine, `${year}-01-01`, `${year}-12-31`, today, workedMap);
  const monthOt = sum.extraMs + liveOvertimeMs(rows, now); // includes today's while still working

  const todays = sessions.filter((s) => s.date === today);
  const active = sessions.find((s) => !s.punchOut);
  const worked = todays.reduce((n, s) => n + workedMs(s, now), 0);
  const left = Math.max(0, DAY_TARGET_MS - worked);
  const overtime = Math.max(0, worked - DAY_TARGET_MS);
  const breakTotal = todays.reduce((n, s) => n + breakMs(s, now), 0);
  const first = todays[0];
  const last = todays[todays.length - 1];

  const status = active
    ? onBreak(active)
      ? { label: "On break", tone: "amber" }
      : { label: `Working since ${formatTime(active.punchIn)}`, tone: "green" }
    : todays.length
      ? { label: `Punched out ${formatTime(last?.punchOut)}`, tone: "gray" }
      : { label: "Not in yet", tone: "gray" };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${employee.name} details`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-4xl space-y-6 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{employee.name}</h2>
            <p className="text-xs text-muted">
              {employee.email}
              {employee.department ? ` · ${employee.department}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={status.tone} raw>
              {status.label}
            </Badge>
            <button onClick={onClose} className="text-xl leading-none text-muted hover:text-foreground" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* ── Today ── */}
        <section>
          <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-accent" />
            Today&apos;s shift
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              compact
              label="Shift done"
              value={formatClock(worked)}
              hint={first ? `since ${formatTime(first.punchIn)}` : "no punches yet"}
              icon={<IconTimer />}
              color="sky"
            />
            <Stat
              compact
              label="Hours left"
              value={formatHM(left)}
              hint={left === 0 ? "8h target reached" : "to reach 8h"}
              icon={<IconHistory />}
              color={left === 0 ? "emerald" : "cyan"}
            />
            <Stat
              compact
              label="Overtime"
              value={overtime ? `+${formatHM(overtime)}` : "0h 00m"}
              hint="beyond 8h today"
              icon={<IconPlus />}
              color={overtime ? "emerald" : "slate"}
              tone={overtime ? "good" : undefined}
            />
            <Stat
              compact
              label="Break taken"
              value={formatHM(breakTotal)}
              hint={
                breakTotal > BREAK_ALLOWED_MS
                  ? `${formatHM(breakTotal - BREAK_ALLOWED_MS)} over the 1h allowance`
                  : `${formatHM(BREAK_ALLOWED_MS - breakTotal)} of 1h left`
              }
              icon={<IconCalendar />}
              color={breakTotal > BREAK_ALLOWED_MS ? "rose" : "amber"}
              tone={breakTotal > BREAK_ALLOWED_MS ? "bad" : undefined}
            />
          </div>
        </section>

        {/* ── This month ── */}
        <section>
          <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-accent" />
            This month
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              compact
              label="Hours worked"
              value={formatHM(sum.workedMs)}
              hint={`${sum.daysWorked} ${sum.daysWorked === 1 ? "day" : "days"} done`}
              icon={<IconBriefcase />}
              color="sky"
            />
            <Stat
              compact
              label="Hours left"
              value={formatHM(Math.max(0, MONTH_TARGET_MS - sum.workedMs))}
              hint="to reach 176h"
              icon={<IconTarget />}
              color={sum.workedMs >= MONTH_TARGET_MS ? "emerald" : "blue"}
            />
            <Stat
              compact
              label="Overtime"
              value={monthOt ? `+${formatHM(monthOt)}` : "0h 00m"}
              hint="beyond 8h on a day"
              icon={<IconPlus />}
              color={monthOt ? "emerald" : "slate"}
              tone={monthOt ? "good" : undefined}
            />
            <Stat
              compact
              label="Short time"
              value={formatHM(sum.shortMs)}
              hint={sum.absentDays ? `incl. ${sum.absentDays} absent day(s)` : "under 8h on a day"}
              icon={<IconMinus />}
              color={sum.shortMs ? "rose" : "slate"}
              tone={sum.shortMs ? "bad" : undefined}
            />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <IconTrend className="h-4 w-4" />
            Net balance so far:{" "}
            <span
              className={`font-semibold ${
                sum.balanceMs > 0 ? "text-emerald-600 dark:text-emerald-400" : sum.balanceMs < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              }`}
            >
              {formatDelta(sum.balanceMs)}
            </span>
          </p>
        </section>

        {/* ── Leaves ── */}
        <section>
          <p className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-accent" />
            Leaves
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              compact
              label="Leave this month"
              value={`${monthLeave.taken} ${monthLeave.taken === 1 ? "day" : "days"}`}
              hint={
                monthLeave.upcoming
                  ? `${monthLeave.upcoming} more approved ahead`
                  : monthLeave.returned
                    ? `${monthLeave.returned} worked in full`
                    : monthLeave.taken
                      ? "approved leave taken"
                      : "none taken"
              }
              icon={<IconCalendar />}
              color={monthLeave.taken ? "orange" : "slate"}
            />
            <Stat
              compact
              label="Casual leave"
              value={`${yearLeave.byType.Casual ?? 0} / ${LEAVE_QUOTA.Casual}`}
              hint={`used in ${year}`}
              icon={<IconSun />}
              color="amber"
            />
            <Stat
              compact
              label="Sick leave"
              value={`${yearLeave.byType.Sick ?? 0} / ${LEAVE_QUOTA.Sick}`}
              hint={`used in ${year}`}
              icon={<IconHeart />}
              color="rose"
            />
            <Stat
              compact
              label="Paid leave"
              value={`${yearLeave.byType.Paid ?? 0} / ${LEAVE_QUOTA.Paid}`}
              hint={`used in ${year}`}
              icon={<IconWallet />}
              color="emerald"
            />
          </div>
          {(yearLeave.byType.Unpaid ?? 0) > 0 && (
            <p className="mt-3 text-sm text-muted">
              Unpaid leave in {year}: <span className="font-semibold text-foreground">{yearLeave.byType.Unpaid} days</span>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
