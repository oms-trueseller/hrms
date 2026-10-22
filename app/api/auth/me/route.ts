import { connection } from "next/server";
import { json } from "@/lib/server/api";
import { getMe } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";
import { toUser } from "@/lib/server/serialize";
import { User } from "@/models/User";

export async function GET() {
  await connection(); // always per-request; never prerender
  try {
    const me = await getMe();
    if (!me) return json({ user: null });
    await connectDB();
    return json({ user: toUser(await User.findById(me.id).lean()) });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
}
