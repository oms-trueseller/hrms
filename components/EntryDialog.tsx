"use client";

import { useState, type FormEvent } from "react";
import { addEntry, DAY_TARGET_MS, updateEntry } from "@/lib/attendance";
import { errorMessage } from "@/lib/api";
import { formatDate, formatDelta, formatHM, toHHMM } from "@/lib/time";
import type { Session } from "@/lib/types";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Add a day's attendance by hand, or edit a session. For a session that is still running,
 * leave Out empty to change only the in time, or fill it in to close the session.
 */
export default function EntryDialog({
  date,
  session,
  userId,
  who,
  onClose,
}: {
  date: string;
  session?: Session;
  /** Admin only: the employee the entry is for. */
  userId?: string;
  /** Employee name shown in the header (admin view). */
  who?: string;
  onClose: () => void;
}) {
  const editing = !!session;
  const running = !!session && !session.punchOut;
  const [inTime, setIn] = useState(session ? toHHMM(session.punchIn) : "09:00");
  const [outTime, setOut] = useState(session ? (session.punchOut ? toHHMM(session.punchOut) : "") : "18:00");
  const [brk, setBrk] = useState(() => {
    if (!session) return 60;
    return Math.round(session.breakMs / 60000); // finished breaks only; a running break is left as is
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closing = !!outTime;
  const span = (toMin(outTime || "00:00") - toMin(inTime)) * 60_000;
  const worked = span - brk * 60_000;
  const valid = closing ? span > 0 && worked >= 0 : running && !!inTime;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) return setError("Out time must be after in time, and break cannot exceed the time on site.");
    setBusy(true);
    try {
      const input = { date, inTime, outTime: closing ? outTime : undefined, breakMinutes: brk };
      if (session) await updateEntry(session.id, input);
      else await addEntry(input, userId);
      onClose();
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
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-5 shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{editing ? "Edit entry" : "Add entry"}</h2>
            <p className="text-xs text-muted">
              {who ? `${who} · ` : ""}
              {formatDate(date)} · times in IST
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-muted hover:text-foreground" aria-label="Close">
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="e-in">In time</label>
            <input id="e-in" type="time" required value={inTime} onChange={(e) => setIn(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="e-out">Out time{running ? " (optional)" : ""}</label>
            <input id="e-out" type="time" required={!running} value={outTime} onChange={(e) => setOut(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="e-brk">Break (min)</label>
            <input
              id="e-brk"
              type="number"
              min={0}
              step={1}
              required
              value={brk}
              onChange={(e) => setBrk(Math.max(0, Number(e.target.value)))}
              className="input"
            />
          </div>
        </div>

        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            valid
              ? "border-accent/25 bg-accent/10 text-foreground"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {!valid ? (
            "Check the in/out times and break."
          ) : closing ? (
            <>
              On site {formatHM(span)} · break {formatHM(brk * 60_000)} · <b>worked {formatHM(worked)}</b> ·{" "}
              <b>{formatDelta(worked - DAY_TARGET_MS)}</b> vs 8h
            </>
          ) : (
            "The session keeps running. Only the in time and break are updated."
          )}
        </p>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button disabled={busy || !valid} className="btn btn-primary">
            {busy ? "Saving…" : editing ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
