import { useId } from "react";

/**
 * Full-area loading screen in the app's look: the "H" logo tile with a spinning gradient ring.
 * (The spinning stops for people who ask their device to reduce motion.)
 */
export default function Loader({ label = "Loading" }: { label?: string }) {
  const id = useId();
  return (
    <div role="status" aria-live="polite" className="grid flex-1 place-items-center p-6">
      <div className="relative h-[72px] w-[72px]">
        <svg viewBox="0 0 72 72" className="absolute inset-0 h-full w-full animate-spin motion-reduce:animate-none" aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <circle cx="36" cy="36" r="32" fill="none" strokeWidth="4" className="stroke-border" />
          <circle
            cx="36"
            cy="36"
            r="32"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="70 201"
            stroke={`url(#${id})`}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-9 w-9 animate-pulse place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-sm font-bold text-black motion-reduce:animate-none">
            H
          </span>
        </span>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
