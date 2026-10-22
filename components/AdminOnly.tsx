"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export default function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <p className="text-sm text-muted">You need admin access to view this page.</p>;
  }
  return <>{children}</>;
}
