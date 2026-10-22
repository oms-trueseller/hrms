"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { login, signup, useAuth } from "@/lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { ready, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setError(null);

    if (isSignup && get("password") !== get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const err = isSignup
      ? await signup({
          name: get("name"),
          email: get("email"),
          password: get("password"),
          department: get("department"),
          designation: get("designation"),
        })
      : await login(get("email"), get("password"));
    setBusy(false);
    if (err) setError(err);
    else router.replace("/dashboard");
  }

  return (
    <div className="grid flex-1 place-items-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-7">
        <div>
          <p className="text-lg font-semibold">
            <span className="text-accent">●</span> HRMS
          </p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted">
            {isSignup ? "The first account created becomes the admin." : "Log in to punch in and track your time."}
          </p>
        </div>

        {isSignup && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        {isSignup && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="department">Department</label>
              <input id="department" name="department" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="designation">Designation</label>
              <input id="designation" name="designation" className="input" />
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="input"
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        {isSignup && (
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" name="confirm" type="password" required minLength={6} className="input" autoComplete="new-password" />
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button disabled={busy} className="btn btn-primary w-full">
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>

        <p className="text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent">
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </form>
    </div>
  );
}
