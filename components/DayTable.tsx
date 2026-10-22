"use client";

import { Fragment, useState } from "react";
import { BREAK_ALLOWED_MS, breakMs, workedMs, type DaySummary } from "@/lib/attendance";
import type { Session } from "@/lib/types";
import { formatDate, formatDelta, formatHM, formatTime } from "@/lib/time";
import { Badge, Empty } from "./ui";

// Set to true to label hand-entered sessions with a "manual entry" tag.
const SHOW_MANUAL_TAG = false;

function Delta({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-muted">in progress</span>;
  if (Math.abs(ms) < 60_000) return <span className="text-muted">On target</span>;
  return (
    <span className={`font-medium ${ms > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
      {formatDelta(ms)}
    </span>
  );
}

export default function DayTable({
  rows,
  now,
  showName,
  names,
  onAdd,
  canAdd,
  onEdit,
  canEdit,
  onDelete,
}: {
  rows: DaySummary[];
  now: number;
  showName?: boolean;
  names?: Record<string, string>;
  /** Show "+ Add" on days with no record (when canAdd allows). */
  onAdd?: (row: DaySummary) => void;
  canAdd?: (row: DaySummary) => boolean;
  /** Show "Edit" on a day's sessions (when canEdit allows). */
  onEdit?: (s: Session) => void;
  canEdit?: (s: Session) => boolean;
  onDelete?: (s: Session) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <Empty>No records yet.</Empty>;
  const hasActions = !!(onAdd || onEdit);
  const cols = (showName ? 9 : 8) + (hasActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead className="border-b border-border">
          <tr>
            <th className="th">Date</th>
            {showName && <th className="th">Employee</th>}
            <th className="th">In</th>
            <th className="th">Out</th>
            <th className="th">On site</th>
            <th className="th">Break</th>
            <th className="th">Worked (net)</th>
            <th className="th">vs 8h</th>
            <th className="th">Status</th>
            {hasActions && <th className="th" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const key = r.date + (r.userId ?? "");
            const expandable = r.sessions.length > 0;
            const has = r.sessions.length > 0;
            const editable = onEdit ? r.sessions.filter((s) => (canEdit ? canEdit(s) : true)) : [];
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
                  <td className="td tabular-nums">{has ? formatHM(r.grossMs) : "—"}</td>
                  <td className="td tabular-nums">
                    {has ? formatHM(r.breakMs) : "—"}
                    {r.breakOverMs > 0 && (
                      <span className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400" title={`Allowed ${formatHM(BREAK_ALLOWED_MS)}`}>
                        +{formatHM(r.breakOverMs)} over
                      </span>
                    )}
                  </td>
                  <td className="td font-medium tabular-nums">{has ? formatHM(r.workedMs) : "—"}</td>
                  <td className="td tabular-nums">
                    {r.expectedMs === 0 && r.deltaMs !== null && !has ? "—" : <Delta ms={r.deltaMs} />}
                  </td>
                  <td className="td"><Badge>{r.status}</Badge></td>
                  {hasActions && (
                    <td className="td text-right">
                      {!has && onAdd && (canAdd ? canAdd(r) : true) && (
                        <button className="text-sm font-medium text-accent" onClick={() => onAdd(r)}>
                          + Add
                        </button>
                      )}
                      {editable.length > 0 && (
                        <button
                          className="text-sm font-medium text-accent"
                          onClick={(e) => {
                            e.stopPropagation(); // do not toggle the row
                            // One session: edit it directly. Several: open the row to pick one.
                            if (editable.length === 1) onEdit?.(editable[0]);
                            else setOpen(key);
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {open === key && (
                  <tr className="bg-background">
                    <td colSpan={cols} className="px-4 py-3">
                      <ul className="space-y-1 text-sm">
                        {r.sessions.map((s, i) => (
                          <li key={s.id} className="flex flex-wrap gap-x-4 text-muted">
                            <span className="font-medium text-foreground">Session {i + 1}</span>
                            <span>
                              {formatTime(s.punchIn)} → {s.punchOut ? formatTime(s.punchOut) : "running"}
                            </span>
                            <span>break {formatHM(breakMs(s, now))}</span>
                            <span>worked {formatHM(workedMs(s, now))}</span>
                            {SHOW_MANUAL_TAG && s.manual && <span className="text-xs font-medium text-amber-600">manual entry</span>}
                            {onEdit && (canEdit ? canEdit(s) : true) && (
                              <span className="ml-auto flex gap-3">
                                <button className="text-accent" onClick={() => onEdit(s)}>Edit</button>
                                {onDelete && s.punchOut && (
                                  <button
                                    className="text-red-600"
                                    onClick={() => confirm(`Delete this session on ${formatDate(r.date)}?`) && onDelete(s)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </span>
                            )}
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
