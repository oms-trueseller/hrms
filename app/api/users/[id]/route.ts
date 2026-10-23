import { isValidObjectId } from "mongoose";
import { fail, json, route } from "@/lib/server/api";
import { invalidateMe } from "@/lib/server/auth";
import { User } from "@/models/User";

export const PATCH = route(
  async (req, me, ctx: RouteContext<"/api/users/[id]">) => {
    const { id } = await ctx.params;
    const { role } = await req.json();
    if (!isValidObjectId(id) || !["admin", "employee"].includes(role)) return fail("Invalid request");
    if (id === me.id) return fail("You cannot change your own role.");
    const r = await User.updateOne({ _id: id }, { role });
    invalidateMe(id); // role changed: drop any cached copy right away
    return r.matchedCount ? json({ ok: true }) : fail("User not found", 404);
  },
  { admin: true },
);
