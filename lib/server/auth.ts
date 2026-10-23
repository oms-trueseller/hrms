import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { connectDB } from "./db";
import { User } from "@/models/User";
import type { Role } from "@/lib/types";

const COOKIE = "hrms_token";
const MAX_AGE = 60 * 60 * 24 * 7;
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set (see .env.local)");
  return new TextEncoder().encode(s);
};

export async function setSessionCookie(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Only mark Secure when actually served over HTTPS; browsers drop Secure cookies on http://<LAN-ip>.
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export interface Me {
  id: string;
  name: string;
  role: Role;
}

/** User id from a valid login cookie, or null. Pure JWT check: no database round trip. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret())).payload.sub ?? null;
  } catch {
    return null; // bad/expired token
  }
}

// Role/name of recently seen users, so most requests skip the user lookup (one DB round trip saved).
// Kept on globalThis so it survives dev hot reloads. Admin-only routes bypass it (see `fresh`).
const TTL_MS = 30_000;
const g = globalThis as unknown as { _meCache?: Map<string, { me: Me; expires: number }> };
const meCache = (g._meCache ??= new Map());

/** Forget cached role/name, e.g. right after changing them. Other server instances catch up within TTL. */
export function invalidateMe(id: string) {
  meCache.delete(id);
}

/**
 * The logged-in user, or null if there is no valid login.
 * Role comes from a short-lived cache unless `fresh` is set (use it for admin-only actions).
 * Database errors are thrown (not treated as "logged out"), so an outage is a 503, not a false 401.
 */
export async function getMe({ fresh = false }: { fresh?: boolean } = {}): Promise<Me | null> {
  const id = await getSessionUserId();
  if (!id) return null;

  const hit = meCache.get(id);
  if (hit && !fresh && hit.expires > Date.now()) return hit.me;

  await connectDB();
  const u = await User.findById(id).select("role name").lean<{ _id: unknown; role: Role; name: string }>();
  if (!u) {
    meCache.delete(id);
    return null;
  }
  const me: Me = { id, name: u.name, role: u.role };
  if (meCache.size > 5000) meCache.clear(); // bound memory
  meCache.set(id, { me, expires: Date.now() + TTL_MS });
  return me;
}
