"use client";

import { useState, type FormEvent } from "react";
import { addEntry, DAY_TARGET_MS, updateEntry } from "@/lib/attendance";
import { errorMessage } from "@/lib/api";
import { formatDate, formatDelta, formatHM } from "@/lib/time";
import type { Session } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const n = new Date(y, m - 1, d + 1);
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Add a past day's attendance by hand, or edit an existing session. */
export default function EntryDialog({
  date: initialDate,
  session,
  min,
  max,
  onClose,
}: {
  date: string;
  session?: Session;
  min: string;
  max: string;
  onClose: () => void;
}) {
  const editing = !!session;
  const [date, setDate] = useState(initialDate);
  const [inTime, setIn] = useState(session ? hhmm(session.punchIn) : "09:00");
  const [outTime, setOut] = useState(session?.punchOut ? hhmm(session.punchOut) : "18:00");
  const [brk, setBrk] = useState(() => {
    if (!session) return 60;
    return Math.round(
      session.breaks.reduce(
        (n, b) => n + (b.end ? new Date(b.end).getTime() - new Date(b.start).getTime() : 0),
        0,
      ) / 60000,
    );
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const span = (toMin(outTime) - toMin(inTime)) * 60_000;
  const worked = span - brk * 60_000;
  const valid = span > 0 && worked >= 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (!valid) return setError("Out time must be after in time, and break cannot exceed the time on site.");
    setBusy(true);
    try {
      const input = { date, inTime, outTime, breakMinutes: brk };
      if (session) await updateEntry(session.id, input);
      else await addEntry(input);
      if (editing) return onClose();
      // Keep the dialog open and move to the next day so a whole month can be filled quickly.
      setSaved(`Saved ${formatDate(date)}`);
      const next = nextDay(date);
      if (next <= max) setDate(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit entry" : "Add entry"}
    >
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{editing ? "Edit entry" : "Add past attendance"}</h2>
            <p className="text-xs text-muted">
              {editing ? "Changes are saved to the database." : "Enter a day you forgot to punch. Saves one day at a time."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-muted hover:text-foreground" aria-label="Close">
            ×
          </button>
        </div>

        <div>
          <label className="label" htmlFor="e-date">Date</label>
          <input id="e-date" type="date" required value={date} min={min} max={max} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="e-in">In</label>
            <input id="e-in" type="time" required value={inTime} onChange={(e) => setIn(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="e-out">Out</label>
            <input id="e-out" type="time" required value={outTime} onChange={(e) => setOut(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="e-brk">Break (min)</label>
            <input id="e-brk" type="number" min={0} step={5} required value={brk} onChange={(e) => setBrk(Math.max(0, Number(e.target.value)))} className="input" />
          </div>
        </div>

        <p className={`rounded-lg bg-background px-3 py-2 text-sm ${valid ? "" : "text-red-600"}`}>
          {valid ? (
            <>
              On site {formatHM(span)} · break {formatHM(brk * 60_000)} · <b>worked {formatHM(worked)}</b> ·{" "}
              <b>{formatDelta(worked - DAY_TARGET_MS)}</b> vs 8h
            </>
          ) : (
            "Check the in/out times and break."
          )}
        </p>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">{saved} ✓ — next date selected</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>{editing ? "Cancel" : "Done"}</button>
          <button disabled={busy || !valid} className="btn btn-primary">
            {busy ? "Saving…" : editing ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
