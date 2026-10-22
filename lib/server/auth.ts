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

/**
 * The logged-in user from the cookie, or null if there is no valid login.
 * Reads role fresh from the DB. Database errors are thrown (not treated as "logged out"),
 * so an outage shows up as a 503 instead of a false 401.
 */
export async function getMe(): Promise<Me | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let sub: string | undefined;
  try {
    sub = (await jwtVerify(token, secret())).payload.sub;
  } catch {
    return null; // bad/expired token
  }
  if (!sub) return null;
  await connectDB();
  const u = await User.findById(sub).select("role name").lean<{ _id: unknown; role: Role; name: string }>();
  return u ? { id: sub, name: u.name, role: u.role } : null;
}
