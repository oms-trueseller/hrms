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
    const email = String(b.email ?? "").trim().toLowerCase();
    await connectDB();
    const user = await User.findOne({ email }).select("+passwordHash");
    const ok = user && (await bcrypt.compare(String(b.password ?? ""), user.passwordHash));
    if (!user || !ok) return fail("Invalid email or password.", 401);
    await setSessionCookie(String(user._id));
    return json({ user: toUser(user) });
  } catch (e) {
    console.error(e);
    return fail("Server error", 500);
  }
}
