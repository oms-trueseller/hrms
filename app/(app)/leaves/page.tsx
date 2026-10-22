"use client";

import { useState, type FormEvent } from "react";
import { Badge, Empty, PageHeader, Stat } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { applyLeave, cancelLeave, leaveDays, LEAVE_QUOTA, LEAVE_TYPES, useLeaves } from "@/lib/leaves";
import { dateKey, formatDate, useNow } from "@/lib/time";
import type { LeaveType } from "@/lib/types";

export default function LeavesPage() {
  const { user } = useAuth();
  const { leaves } = useLeaves();
  const [error, setError] = useState<string | null>(null);
  const today = dateKey(useNow(false));
  if (!user) return null;

  const mine = leaves;
  const year = String(new Date().getFullYear());
  const used = (type: LeaveType) =>
    mine
      .filter((l) => l.type === type && l.status === "approved" && l.from.startsWith(year))
      .reduce((n, l) => n + leaveDays(l), 0);

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
      <PageHeader title="Leaves" subtitle="Apply for leave and track approvals." />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(LEAVE_QUOTA) as LeaveType[]).map((t) => (
          <Stat key={t} label={`${t} leave`} value={`${LEAVE_QUOTA[t]! - used(t)} left`} hint={`${used(t)} of ${LEAVE_QUOTA[t]} used`} />
        ))}
        <Stat label="Unpaid leave" value={`${used("Unpaid")} taken`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form onSubmit={onSubmit} className="card h-fit space-y-4">
          <h2 className="font-semibold">Apply for leave</h2>
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
          <h2 className="px-5 py-4 font-semibold">My requests</h2>
          {mine.length === 0 ? (
            <Empty>No leave requests yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="border-y border-border">
                  <tr>
                    <th className="th">Type</th>
                    <th className="th">Dates</th>
                    <th className="th">Days</th>
                    <th className="th">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mine.map((l) => (
                    <tr key={l.id}>
                      <td className="td font-medium" title={l.reason}>{l.type}</td>
                      <td className="td">{formatDate(l.from)}{l.to !== l.from && ` – ${formatDate(l.to)}`}</td>
                      <td className="td">{leaveDays(l)}</td>
                      <td className="td"><Badge>{l.status}</Badge></td>
                      <td className="td text-right">
                        {l.status === "pending" && (
                          <button className="text-sm text-red-600" onClick={() => cancelLeave(l.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
