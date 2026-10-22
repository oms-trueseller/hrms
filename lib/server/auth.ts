import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
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
    secure: process.env.NODE_ENV === "production",
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

/** The logged-in user from the cookie, or null. Reads role fresh from the DB. */
export async function getMe(): Promise<Me | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    await connectDB();
    const u = await User.findById(payload.sub).select("role name").lean<{ _id: unknown; role: Role; name: string }>();
    return u ? { id: payload.sub, name: u.name, role: u.role } : null;
  } catch {
    return null;
  }
}
