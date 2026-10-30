import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  blue: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  gray: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const STATUS_TONE: Record<string, string> = {
  Working: "blue",
  "Full day": "green",
  Short: "amber",
  "Very short": "red",
  "Not in yet": "gray",
  approved: "green",
  pending: "amber",
  "On leave": "slate",
  Absent: "red",
  rejected: "red",
  Weekend: "gray",
};

/** A small status chip. Words are capitalised unless `raw` is set (use it for text with times, e.g. "03:06 am"). */
export function Badge({ children, tone, raw }: { children: string; tone?: string; raw?: boolean }) {
  const t = TONES[tone ?? STATUS_TONE[children] ?? "gray"];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${raw ? "" : "capitalize"} ${t}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE = {
  sky: "bg-sky-500/15 text-sky-500",
  cyan: "bg-cyan-500/15 text-cyan-400",
  blue: "bg-blue-500/15 text-blue-400",
  emerald: "bg-emerald-500/15 text-emerald-500",
  amber: "bg-amber-500/15 text-amber-500",
  orange: "bg-orange-500/15 text-orange-500",
  rose: "bg-rose-500/15 text-rose-500",
  slate: "bg-slate-500/20 text-slate-400",
} as const;

export type BadgeColor = keyof typeof BADGE;

/** A number card with a soft coloured icon circle on the right. `tone` colours the value itself. */
export function Stat({
  label,
  value,
  hint,
  icon,
  color = "sky",
  tone,
  compact,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  color?: BadgeColor;
  tone?: "good" | "bad";
  /** Smaller card for tight spaces such as dialogs: smaller number and icon, value never wraps. */
  compact?: boolean;
}) {
  const valueColor =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "";
  return (
    <div className={`card flex items-start justify-between gap-2 ${compact ? "p-4" : ""}`}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className={`mt-1 font-semibold tabular-nums ${compact ? "whitespace-nowrap text-xl" : "text-2xl"} ${valueColor}`}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {icon && (
        <span
          className={`grid shrink-0 place-items-center rounded-full ${compact ? "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4" : "h-10 w-10"} ${BADGE[color]}`}
        >
          {icon}
        </span>
      )}
    </div>
  );
}

/** A heading with a short coloured bar in front of it. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-semibold">
      <span aria-hidden="true" className="h-5 w-1 rounded-full bg-accent" />
      {children}
    </h2>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>;
}
