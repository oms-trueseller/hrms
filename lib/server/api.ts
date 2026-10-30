import { NextResponse } from "next/server";
import { connectDB } from "./db";
import { getMe, type Me } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => json({ error: message }, status);

type Handler<C> = (req: Request, me: Me, ctx: C) => Promise<Response>;

/** Wraps a route handler: DB connect, auth check, optional admin check, error mapping. */
export function route<C = unknown>(handler: Handler<C>, opts: { admin?: boolean } = {}) {
  return async (req: Request, ctx: C) => {
    const started = performance.now();
    let res: Response;
    try {
      await connectDB();
      const me = await getMe({ fresh: opts.admin }); // admin-only routes always re-check the role in the DB
      if (!me) res = fail("Not authenticated", 401);
      else if (opts.admin && me.role !== "admin") res = fail("Admin access required", 403);
      else res = await handler(req, me, ctx);
    } catch (e) {
      res = serverError(e);
    }
    // How long the server itself took. Shows up in the browser's Network tab (Timing), so a slow
    // moment can be told apart: server time here, versus the network or the browser.
    const ms = performance.now() - started;
    res.headers.set("Server-Timing", `app;dur=${ms.toFixed(0)}`);
    if (ms > SLOW_MS) console.warn(`[slow] ${req.method} ${new URL(req.url).pathname} took ${ms.toFixed(0)} ms`);
    return res;
  };
}

/** A request slower than this is written to the server console. */
const SLOW_MS = 500;

/** Maps thrown errors to a response; database connectivity problems become a clear 503. */
export function serverError(e: unknown) {
  console.error(e);
  const name = e instanceof Error ? e.name : "";
  if (name.startsWith("MongoServerSelection") || name.startsWith("MongoNetwork") || name === "MongooseServerSelectionError") {
    return fail("Cannot reach the database. Check your internet connection and Atlas Network Access (IP allow list).", 503);
  }
  return fail("Server error", 500);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
