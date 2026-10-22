"use client";

import { useMemo, useState } from "react";
import DayTable from "@/components/DayTable";
import { PageHeader, Stat } from "@/components/ui";
import { buildMonth, useAttendance } from "@/lib/attendance";
import { useAuth } from "@/lib/auth";
import { useLeaves } from "@/lib/leaves";
import { formatHM, monthKey, useNow } from "@/lib/time";

export default function HistoryPage() {
  const { user } = useAuth();
  const { sessions } = useAttendance();
  const { leaves } = useLeaves();
  const now = useNow();
  const [month, setMonth] = useState(() => monthKey(Date.now()));

  const rows = useMemo(
    () =>
      buildMonth(
        month,
        sessions.filter((s) => s.userId === user?.id),
        leaves.filter((l) => l.userId === user?.id),
        now,
      ),
    [month, sessions, leaves, user?.id, now],
  );
  if (!user) return null;

  const total = rows.reduce((n, r) => n + r.workedMs, 0);
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const present = count("Present") + count("Working");

  function exportCsv() {
    const lines = [
      "Date,First in,Last out,Break (min),Worked (min),Status",
      ...rows.map((r) =>
        [
          r.date,
          r.firstIn ? new Date(r.firstIn).toLocaleTimeString() : "",
          r.lastOut ? new Date(r.lastOut).toLocaleTimeString() : "",
          Math.round(r.breakMs / 60000),
          Math.round(r.workedMs / 60000),
          r.status,
        ].join(","),
      ),
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
          </div>
        }
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total worked" value={formatHM(total)} />
        <Stat label="Present" value={String(present)} />
        <Stat label="Half days" value={String(count("Half day"))} />
        <Stat label="Absent" value={String(count("Absent"))} hint={`${count("On leave")} on leave`} />
      </section>
      <section className="card p-0">
        <DayTable rows={rows} now={now} />
      </section>
    </>
  );
}
