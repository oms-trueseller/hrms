"use client";

import { useMemo, useState, type FormEvent } from "react";
import { IconBan, IconHeart, IconSun, IconWallet } from "@/components/icons";
import { Badge, Empty, PageHeader, SectionTitle, Stat, type BadgeColor } from "@/components/ui";
import { useAttendance, workedMs } from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import {
  applyLeave,
  cancelLeave,
  leaveDays,
  leaveUsage,
  LEAVE_QUOTA,
  LEAVE_TYPES,
  useLeaves,
  type LeaveUsage,
} from "@/lib/leaves";
import { dateKey, formatDate, useNow } from "@/lib/time";
import type { Leave, LeaveType } from "@/lib/types";

const LEAVE_ICON: Record<LeaveType, React.ReactNode> = {
  Casual: <IconSun />,
  Sick: <IconHeart />,
  Paid: <IconWallet />,
  Unpaid: <IconBan />,
};
const LEAVE_COLOR: Record<LeaveType, BadgeColor> = { Casual: "amber", Sick: "rose", Paid: "emerald", Unpaid: "slate" };

export default function LeavesPage() {
  const { user } = useAuth();
  const { leaves } = useLeaves();
  const [error, setError] = useState<string | null>(null);
  const today = dateKey(useNow(false));
  const year = today.slice(0, 4);

  // This year's approved leaves up to today: we need the attendance on those days to see which
  // leave days the employee actually came in for.
  const approvedThisYear = useMemo(
    () => leaves.filter((l) => l.status === "approved" && l.from.startsWith(year) && l.from <= today),
    [leaves, year, today],
  );
  const range = useMemo(() => {
    if (!approvedThisYear.length) return null;
    const from = approvedThisYear.reduce((m, l) => (l.from < m ? l.from : m), "9999-12-31");
    const lastTo = approvedThisYear.reduce((m, l) => (l.to > m ? l.to : m), "0000-01-01");
    return { from, to: lastTo < today ? lastTo : today };
  }, [approvedThisYear, today]);
  const { sessions } = useAttendance(range);

  // Net worked time per day from finished sessions.
  const workedByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sessions) if (s.punchOut) m[s.date] = (m[s.date] ?? 0) + workedMs(s, 0);
    return m;
  }, [sessions]);

  if (!user) return null;

  const mine = leaves;
  const usageOf = (l: Leave): LeaveUsage =>
    l.status === "approved"
      ? leaveUsage(l, workedByDate, today)
      : { days: leaveDays(l), returned: [], counted: leaveDays(l) };

  const thisYear = mine.filter((l) => l.status === "approved" && l.from.startsWith(year));
  const used = (type: LeaveType) =>
    thisYear.filter((l) => l.type === type).reduce((n, l) => n + usageOf(l).counted, 0);
  const returnedBy = (type: LeaveType) =>
    thisYear.filter((l) => l.type === type).reduce((n, l) => n + usageOf(l).returned.length, 0);
  const returnedTotal = thisYear.reduce((n, l) => n + usageOf(l).returned.length, 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const from = String(f.get("from"));
    const to = String(f.get("to"));
    if (to < from) return setError("End date cannot be before start date.");
    const err = await applyLeave({
      type: String(f.get("type")) as LeaveType,
      from,
      to,
      reason: String(f.get("reason")).trim(),
    });
    setError(err);
    if (!err) form.reset();
  }

  return (
    <>
      <PageHeader title="Leaves" subtitle="Apply for leave and track approvals. Only working days (Mon–Fri) count." />

      {returnedTotal > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          <span className="font-semibold">
            You worked a full day on {returnedTotal} approved leave {returnedTotal === 1 ? "day" : "days"}.
          </span>{" "}
          {returnedTotal === 1 ? "That day is" : "Those days are"} not counted as leave and{" "}
          {returnedTotal === 1 ? "has" : "have"} been returned to your balance.
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(LEAVE_QUOTA) as LeaveType[]).map((t) => (
          <Stat
            key={t}
            label={`${t} leave`}
            value={`${LEAVE_QUOTA[t]! - used(t)} left`}
            hint={`${used(t)} of ${LEAVE_QUOTA[t]} used${returnedBy(t) ? ` · ${returnedBy(t)} returned` : ""}`}
            icon={LEAVE_ICON[t]}
            color={LEAVE_COLOR[t]}
          />
        ))}
        <Stat
          label="Unpaid leave"
          value={`${used("Unpaid")} taken`}
          hint={returnedBy("Unpaid") ? `${returnedBy("Unpaid")} returned` : undefined}
          icon={LEAVE_ICON.Unpaid}
          color={LEAVE_COLOR.Unpaid}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form onSubmit={onSubmit} className="card h-fit space-y-4">
          <SectionTitle>Apply for leave</SectionTitle>
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" name="type" className="input">
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="from">From</label>
              <input id="from" name="from" type="date" required min={today} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="to">To</label>
              <input id="to" name="to" type="date" required min={today} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="reason">Reason</label>
            <textarea id="reason" name="reason" required rows={3} className="input" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="btn btn-primary w-full">Submit request</button>
        </form>

        <section className="card p-0">
          <div className="px-5 py-4"><SectionTitle>My requests</SectionTitle></div>
          {mine.length === 0 ? (
            <Empty>No leave requests yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-y border-border bg-foreground/[0.04]">
                  <tr>
                    <th className="th">Type</th>
                    <th className="th">Dates</th>
                    <th className="th">Days counted</th>
                    <th className="th">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mine.map((l) => {
                    const u = usageOf(l);
                    return (
                      <tr key={l.id}>
                        <td className="td font-medium" title={l.reason}>{l.type}</td>
                        <td className="td">{formatDate(l.from)}{l.to !== l.from && ` – ${formatDate(l.to)}`}</td>
                        <td className="td">
                          <p className="font-medium">{u.counted}</p>
                          {u.returned.length > 0 && (
                            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                              Worked a full day on {u.returned.map((d) => formatDate(d).replace(/, \d{4}$/, "")).join(", ")}:
                              not counted
                            </p>
                          )}
                        </td>
                        <td className="td"><Badge>{l.status}</Badge></td>
                        <td className="td text-right">
                          {l.status === "pending" && (
                            <button className="text-sm text-red-600" onClick={() => cancelLeave(l.id)}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
