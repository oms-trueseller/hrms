import { isValidObjectId } from "mongoose";
import { fail, json, route } from "@/lib/server/api";
import { Leave } from "@/models/Leave";

/** Admin: set status to approved / rejected / pending. */
export const PATCH = route(
  async (req, me, ctx: RouteContext<"/api/leaves/[id]">) => {
    const { id } = await ctx.params;
    const { status } = await req.json();
    if (!isValidObjectId(id) || !["pending", "approved", "rejected"].includes(status)) return fail("Invalid request");
    const r = await Leave.updateOne({ _id: id }, { status, reviewedBy: me.id });
    return r.matchedCount ? json({ ok: true }) : fail("Leave not found", 404);
  },
  { admin: true },
);

/** Cancel own pending request. */
export const DELETE = route(async (_req, me, ctx: RouteContext<"/api/leaves/[id]">) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("Invalid request");
  const res = await Leave.deleteOne({ _id: id, userId: me.id, status: "pending" });
  return res.deletedCount ? json({ ok: true }) : fail("Only your pending requests can be cancelled.", 409);
});
