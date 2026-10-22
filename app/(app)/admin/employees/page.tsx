"use client";

import AdminOnly from "@/components/AdminOnly";
import { Badge, PageHeader } from "@/components/ui";
import { activeSession, onBreak, useAttendance, workedMs } from "@/lib/attendance";
import { setRole, useAuth, useUsers } from "@/lib/auth";
import { dateKey, formatClock, formatDate, useNow } from "@/lib/time";

export default function EmployeesPage() {
  const { user } = useAuth();
  const users = useUsers(30_000);
  const now = useNow();
  const today = dateKey(now);
  const { sessions } = useAttendance({ from: today, to: today, userId: "all" });

  return (
    <AdminOnly>
      <PageHeader title="Employees" subtitle={`${users.length} registered · live status`} />
      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border">
            <tr>
              <th className="th">Employee</th>
              <th className="th">Department</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
              <th className="th">Today</th>
              <th className="th">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const active = activeSession(sessions, u.id);
              const ms = sessions
                .filter((s) => s.userId === u.id && s.date === today)
                .reduce((n, s) => n + workedMs(s, now), 0);
              return (
                <tr key={u.id}>
                  <td className="td">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="td">{[u.department, u.designation].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="td">{formatDate(dateKey(u.joinedAt))}</td>
                  <td className="td">
                    {active ? <Badge tone={onBreak(active) ? "amber" : "green"}>{onBreak(active) ? "On break" : "Punched in"}</Badge> : <Badge tone="gray">Out</Badge>}
                  </td>
                  <td className="td font-mono tabular-nums">{formatClock(ms)}</td>
                  <td className="td">
                    <select
                      value={u.role}
                      disabled={u.id === user?.id}
                      onChange={(e) => setRole(u.id, e.target.value as "admin" | "employee")}
                      className="input w-auto py-1"
                      aria-label={`Role for ${u.name}`}
                    >
                      <option value="employee">employee</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </AdminOnly>
  );
}
