"use client";

import { Fragment, useState } from "react";
import { breakMs, workedMs, type DaySummary } from "@/lib/attendance";
import { formatDate, formatHM, formatTime } from "@/lib/time";
import { Badge, Empty } from "./ui";

export default function DayTable({
  rows,
  now,
  showName,
  names,
}: {
  rows: DaySummary[];
  now: number;
  showName?: boolean;
  names?: Record<string, string>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <Empty>No records yet.</Empty>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-border">
          <tr>
            <th className="th">Date</th>
            {showName && <th className="th">Employee</th>}
            <th className="th">First in</th>
            <th className="th">Last out</th>
            <th className="th">Breaks</th>
            <th className="th">Worked</th>
            <th className="th">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const key = r.date + (r.userId ?? "");
            const expandable = r.sessions.length > 0;
            return (
              <Fragment key={key}>
                <tr
                  onClick={() => expandable && setOpen(open === key ? null : key)}
                  className={expandable ? "cursor-pointer hover:bg-background" : ""}
                >
                  <td className="td font-medium">{formatDate(r.date)}</td>
                  {showName && <td className="td">{(r.userId && names?.[r.userId]) || "—"}</td>}
                  <td className="td tabular-nums">{formatTime(r.firstIn)}</td>
                  <td className="td tabular-nums">{r.status === "Working" ? "…" : formatTime(r.lastOut)}</td>
                  <td className="td tabular-nums">{r.breakMs ? formatHM(r.breakMs) : "—"}</td>
                  <td className="td tabular-nums">{r.sessions.length ? formatHM(r.workedMs) : "—"}</td>
                  <td className="td"><Badge>{r.status}</Badge></td>
                </tr>
                {open === key && (
                  <tr className="bg-background">
                    <td colSpan={showName ? 7 : 6} className="px-4 py-3">
                      <ul className="space-y-1 text-sm">
                        {r.sessions.map((s, i) => (
                          <li key={s.id} className="flex flex-wrap gap-x-4 text-muted">
                            <span className="font-medium text-foreground">Session {i + 1}</span>
                            <span>
                              {formatTime(s.punchIn)} → {s.punchOut ? formatTime(s.punchOut) : "running"}
                            </span>
                            <span>break {formatHM(breakMs(s, now))}</span>
                            <span>worked {formatHM(workedMs(s, now))}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
