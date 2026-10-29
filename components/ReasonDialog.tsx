"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/api";
import { BREAK_REASON_MS } from "@/lib/attendance";
import { formatHM } from "@/lib/time";

const MIN = 3;
const MAX = 200;

/** Asks for the reason behind a long break before it can be ended. */
export default function ReasonDialog({
  totalMs,
  confirmLabel,
  who,
  onSubmit,
  onClose,
}: {
  /** The day's break total, in ms. */
  totalMs: number;
  /** Text of the confirm button, e.g. "End break" or "Punch out". */
  confirmLabel: string;
  /** Employee name, when an admin is acting for someone. */
  who?: string;
  /** Should throw (with a readable message) if saving fails. */
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reason for long break"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 shadow-2xl ring-1 ring-black/10">
        <div>
          <h2 className="text-lg font-semibold">Why was the break long?</h2>
          <p className="mt-1 text-sm text-muted">
            {who ? `${who}'s` : "Your"} break today is{" "}
            <span className="font-medium text-amber-600 dark:text-amber-400">{formatHM(totalMs)}</span>, more than{" "}
            {formatHM(BREAK_REASON_MS)}. Please give a short reason. Admins can see it.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="break-reason">Reason</label>
          <textarea
            id="break-reason"
            autoFocus
            rows={3}
            maxLength={MAX}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Doctor appointment, bank work, power cut at home…"
            className="input resize-none"
          />
          <p className="mt-1 text-right text-xs text-muted">
            {trimmed.length}/{MAX}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !valid}>
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
