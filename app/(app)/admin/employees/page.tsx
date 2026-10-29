"use client";

import { useState } from "react";
import AdminOnly from "@/components/AdminOnly";
import ReasonDialog from "@/components/ReasonDialog";
import { Badge, PageHeader } from "@/components/ui";
import {
  activeReasons,
  activeSession,
  attendanceAction,
  BREAK_REASON_MS,
  breakMs,
  onBreak,
  useAttendance,
  workedMs,
} from "@/lib/attendance";
import { ApiError, errorMessage } from "@/lib/api";
import { setRole, useAuth, useUsers } from "@/lib/auth";
import { dateKey, formatClock, formatDate, formatHM, useNow } from "@/lib/time";

export default function EmployeesPage() {
  const { user } = useAuth();
  const users = useUsers(30_000);
  const now = useNow();
  const today = dateKey(now);
  const { sessions } = useAttendance({ from: today, to: today, userId: "all" }, 15_000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set while the "why was the break long?" dialog is open for an employee.
  const [ask, setAsk] = useState<{ userId: string; name: string; totalMs: number; action: "endBreak" | "punchOut" } | null>(null);

  /**
   * Punch in/out or break for an employee: an admin can do all of these for anyone. Ending a break (or
   * punching out on one) that takes the day past the limit needs a reason; the admin writes it on their behalf.
   */
  async function act(
    userId: string,
    name: string,
    action: "punchIn" | "startBreak" | "endBreak" | "punchOut",
    totalMs: number,
    onBreakNow: boolean,
  ) {
    if (action === "punchOut" && !confirm(`Punch out ${name} now?`)) return;
    if (action === "punchIn" && !confirm(`Punch in ${name} now?`)) return;
    const endsBreak = action === "endBreak" || (action === "punchOut" && onBreakNow);
    if (endsBreak && totalMs > BREAK_REASON_MS && (action === "endBreak" || action === "punchOut")) {
      return setAsk({ userId, name, totalMs, action });
    }
    setBusyId(userId);
    setError(null);
    try {
      await attendanceAction(action, userId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "REASON_REQUIRED" && (action === "endBreak" || action === "punchOut")) {
        setAsk({ userId, name, totalMs, action });
      } else setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminOnly>
      <PageHeader title="Employees" subtitle={`${users.length} registered · live status`} />
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[960px]">
          <thead className="border-b border-border bg-foreground/[0.04]">
            <tr>
              <th className="th">Employee</th>
              <th className="th">Department</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
              <th className="th">Today</th>
              <th className="th">Break</th>
              <th className="th">Punch</th>
              <th className="th">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const active = activeSession(sessions, u.id);
              const todays = sessions.filter((s) => s.userId === u.id && s.date === today);
              const ms = todays.reduce((n, s) => n + workedMs(s, now), 0);
              const breakTotal = todays.reduce((n, s) => n + breakMs(s, now), 0);
              const reasons = activeReasons(todays, now);
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
                  <td className="td whitespace-nowrap">
                    {active ? (
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted">{formatHM(breakTotal)}</span>
                        {reasons.length > 0 && (
                          <span
                            className="cursor-help text-xs font-medium text-amber-600 dark:text-amber-400"
                            title={reasons.map((r) => r.reason).join(" | ")}
                          >
                            reason
                          </span>
                        )}
                        <button
                          className="btn px-3 py-1"
                          disabled={busyId === u.id}
                          onClick={() => act(u.id, u.name, onBreak(active) ? "endBreak" : "startBreak", breakTotal, onBreak(active))}
                        >
                          {onBreak(active) ? "End break" : "Start break"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="td whitespace-nowrap">
                    {active ? (
                      <button
                        className="btn px-3 py-1 text-rose-600 dark:text-rose-400"
                        disabled={busyId === u.id}
                        onClick={() => act(u.id, u.name, "punchOut", breakTotal, onBreak(active))}
                      >
                        Punch out
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary px-3 py-1"
                        disabled={busyId === u.id}
                        onClick={() => act(u.id, u.name, "punchIn", breakTotal, false)}
                      >
                        Punch in
                      </button>
                    )}
                  </td>
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
      {ask && (
        <ReasonDialog
          totalMs={ask.totalMs}
          who={ask.name}
          confirmLabel={ask.action === "punchOut" ? "Punch out" : "End break"}
          onSubmit={async (reason) => {
            await attendanceAction(ask.action, ask.userId, reason);
            setAsk(null);
          }}
          onClose={() => setAsk(null)}
        />
      )}
    </AdminOnly>
  );
}
