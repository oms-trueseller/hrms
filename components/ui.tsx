import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/15 text-red-600 dark:text-red-400",
  gray: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const STATUS_TONE: Record<string, string> = {
  Working: "blue",
  Present: "green",
  approved: "green",
  "Half day": "amber",
  pending: "amber",
  "On leave": "blue",
  Absent: "red",
  rejected: "red",
  Weekend: "gray",
};

export function Badge({ children, tone }: { children: string; tone?: string }) {
  const t = TONES[tone ?? STATUS_TONE[children] ?? "gray"];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${t}`}>
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

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>;
}
