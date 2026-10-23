"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { logout, useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "Attendance history" },
  { href: "/leaves", label: "Leaves" },
  { href: "/profile", label: "Profile" },
];

const ADMIN_NAV = [
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/attendance", label: "All attendance" },
  { href: "/admin/leaves", label: "Leave approvals" },
];

const noopSubscribe = () => () => {};
/** false on the server and during hydration, true afterwards. */
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export default function Shell({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) {
    // Mount the page (hidden, client-side only) while the login check runs, so its data requests go out
    // in parallel with it instead of waiting for it. SWR shares the in-flight requests when it is shown.
    return (
      <>
        <div className="grid flex-1 place-items-center text-sm text-muted">Loading…</div>
        {isClient && <div hidden>{children}</div>}
      </>
    );
  }
  if (!user) {
    return <div className="grid flex-1 place-items-center text-sm text-muted">Loading…</div>;
  }

  const items = user.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <p className="text-lg font-semibold tracking-tight">
            <span className="text-accent">●</span> HRMS
          </p>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="text-sm text-muted hover:text-foreground md:hidden"
          >
            Log out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {items.map((i) => {
            const active = pathname === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent/15 text-accent" : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 hidden border-t border-border p-4 md:block">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">
            {user.email} · {user.role}
          </p>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="btn mt-3 w-full"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
