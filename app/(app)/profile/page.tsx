"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/ui";
import { updateProfile, useAuth } from "@/lib/auth";
import { formatDate, dateKey } from "@/lib/time";

export default function ProfilePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  if (!user) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    await updateProfile({
      name: get("name"),
      phone: get("phone"),
      department: get("department"),
      designation: get("designation"),
    });
    setSaved(true);
  }

  return (
    <>
      <PageHeader title="Profile" subtitle={`${user.email} · ${user.role} · joined ${formatDate(dateKey(user.joinedAt))}`} />
      <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="card max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" required defaultValue={user.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={user.phone} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <input id="department" name="department" defaultValue={user.department} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="designation">Designation</label>
            <input id="designation" name="designation" defaultValue={user.designation} className="input" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary">Save changes</button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </>
  );
}
