"use client";

import { useMemo, useState } from "react";
import AdminOnly from "@/components/AdminOnly";
import DayTable from "@/components/DayTable";
import EntryDialog from "@/components/EntryDialog";
import { PageHeader } from "@/components/ui";
import { summarizeDay, useAttendance, type DaySummary } from "@/lib/attendance";
import { useUsers } from "@/lib/auth";
import type { Session } from "@/lib/types";
import { useLeaveSpans } from "@/lib/leaves";
import { dateKey, useNow } from "@/lib/time";

export default function AllAttendancePage() {
  const users = useUsers();
  const now = useNow();
  const [date, setDate] = useState(() => dateKey(Date.now()));
  const [employee, setEmployee] = useState("all");
  const { sessions } = useAttendance({ from: date, to: date, userId: employee });
  const leaves = useLeaveSpans(true);
  // Entry being added (no session) or edited, for one employee on the chosen date.
  const [dialog, setDialog] = useState<{ userId: string; session?: Session } | null>(null);

  const names = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);

  // One row per employee for the chosen date, including absentees.
  const rows = useMemo<DaySummary[]>(
    () =>
      users
        .filter((u) => employee === "all" || u.id === employee)
        .map((u) =>
          summarizeDay(
            date,
            sessions.filter((s) => s.userId === u.id && s.date === date),
            leaves.filter((l) => l.userId === u.id),
            now,
            u.id,
          ),
        ),
    [users, sessions, leaves, date, employee, now],
  );

  return (
    <AdminOnly>
      <PageHeader
        title="All attendance"
        subtitle="Everyone's attendance for a single day. Admins can add or correct any entry."
        action={
          <div className="flex gap-2">
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="input w-auto" aria-label="Employee">
              <option value="all">All employees</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" value={date} max={dateKey(now)} onChange={(e) => e.target.value && setDate(e.target.value)} className="input w-auto" aria-label="Date" />
          </div>
        }
      />
      <section className="card p-0">
        <DayTable
          rows={rows}
          now={now}
          showName
          names={names}
          onAdd={(r) => r.userId && setDialog({ userId: r.userId })}
          onEdit={(s) => setDialog({ userId: s.userId, session: s })}
        />
      </section>
      {dialog && (
        <EntryDialog
          key={`${date}-${dialog.userId}-${dialog.session?.id ?? "new"}`}
          date={date}
          session={dialog.session}
          userId={dialog.userId}
          who={names[dialog.userId]}
          onClose={() => setDialog(null)}
        />
      )}
    </AdminOnly>
  );
}
