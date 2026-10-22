import { isValidObjectId } from "mongoose";
import { fail, json, route } from "@/lib/server/api";
import { toUser } from "@/lib/server/serialize";
import { User } from "@/models/User";

export const PATCH = route(
  async (req, me, ctx: RouteContext<"/api/users/[id]">) => {
    const { id } = await ctx.params;
    const { role } = await req.json();
    if (!isValidObjectId(id) || !["admin", "employee"].includes(role)) return fail("Invalid request");
    if (id === me.id) return fail("You cannot change your own role.");
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).lean();
    return user ? json({ user: toUser(user) }) : fail("User not found", 404);
  },
  { admin: true },
);
