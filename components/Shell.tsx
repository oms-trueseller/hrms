"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  IconBriefcase,
  IconCalendar,
  IconCheckCircle,
  IconClipboard,
  IconDashboard,
  IconHistory,
  IconUser,
  IconUsers,
} from "@/components/icons";
import Loader from "@/components/Loader";
import { logout, useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/history", label: "Attendance history", Icon: IconHistory },
  { href: "/leaves", label: "Leaves", Icon: IconCalendar },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

const ADMIN_NAV = [
  { href: "/admin/employees", label: "Employees", Icon: IconUsers },
  { href: "/admin/attendance", label: "All attendance", Icon: IconClipboard },
  { href: "/admin/hours", label: "Monthly hours", Icon: IconBriefcase },
  { href: "/admin/leaves", label: "Leave approvals", Icon: IconCheckCircle },
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
        <Loader />
        {isClient && <div hidden>{children}</div>}
      </>
    );
  }
  if (!user) {
    return <Loader />;
  }

  const items = user.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* On desktop the sidebar stays put while the page scrolls; it scrolls by itself only if it is taller than the screen. */}
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:self-start md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex shrink-0 items-center justify-between px-5 py-4 md:block">
          <p className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-sm font-bold text-black">
              H
            </span>
            HRMS
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
        <nav className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-x-visible md:pb-0">
          {items.map((i) => {
            const active = pathname === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-foreground/[0.08] text-foreground shadow-[inset_3px_0_0_0_var(--accent)]"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <i.Icon className={`h-[18px] w-[18px] ${active ? "text-accent" : ""}`} />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 hidden shrink-0 border-t border-border p-4 md:mt-auto md:block">
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
