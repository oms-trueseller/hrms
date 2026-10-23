import { connection } from "next/server";
import { json, serverError } from "@/lib/server/api";
import { getSessionUserId } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";
import { toUser, USER_FIELDS } from "@/lib/server/serialize";
import { User } from "@/models/User";

export async function GET() {
  await connection(); // always per-request; never prerender
  try {
    // Cookie check needs no DB; then a single lookup of the full user.
    const id = await getSessionUserId();
    if (!id) return json({ user: null });
    await connectDB();
    const user = await User.findById(id).select(USER_FIELDS).lean();
    return json({ user: user ? toUser(user) : null });
  } catch (e) {
    return serverError(e);
  }
}
