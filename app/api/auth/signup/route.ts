import bcrypt from "bcryptjs";
import { fail, json } from "@/lib/server/api";
import { getMe, setSessionCookie } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";
import { toUser } from "@/lib/server/serialize";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();
    const current = await getMe();
    if (current) {
      return fail(
        `${current.name} is already logged in on this browser. Log out first to use a different account.`,
        409,
      );
    }
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid name and email.");
    if (password.length < 6) return fail("Password must be at least 6 characters.");

    await connectDB();
    const passwordHash = await bcrypt.hash(password, 10);
    // The first account becomes the admin.
    const role = (await User.estimatedDocumentCount()) === 0 ? "admin" : "employee";
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      department: String(b.department ?? ""),
      designation: String(b.designation ?? ""),
    });
    await setSessionCookie(String(user._id));
    return json({ user: toUser(user) }, 201);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return fail("An account with this email already exists.", 409);
    console.error(e);
    return fail("Server error", 500);
  }
}
