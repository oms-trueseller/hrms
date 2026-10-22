import { isValidObjectId } from "mongoose";
import { fail, json, route } from "@/lib/server/api";
import { findOverlap, parseEntry } from "@/lib/server/manual";
import { toSession } from "@/lib/server/serialize";
import { Attendance } from "@/models/Attendance";

/** Edit one of your own finished sessions. Body: { date, punchIn, punchOut, breakMinutes }. */
export const PATCH = route(async (req, me, ctx: RouteContext<"/api/attendance/[id]">) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("Invalid request");
  const e = parseEntry(await req.json());
  if (typeof e === "string") return fail(e);
  if (await findOverlap(me.id, e, id)) return fail("This overlaps another entry on the same day.", 409);
  const s = await Attendance.findOneAndUpdate(
    { _id: id, userId: me.id, punchOut: { $exists: true } },
    { $set: { ...e, manual: true } },
    { new: true },
  ).lean();
  return s ? json({ session: toSession(s) }) : fail("Entry not found, or it is still running.", 404);
});

/** Delete one of your own finished sessions. */
export const DELETE = route(async (_req, me, ctx: RouteContext<"/api/attendance/[id]">) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("Invalid request");
  const r = await Attendance.deleteOne({ _id: id, userId: me.id, punchOut: { $exists: true } });
  return r.deletedCount ? json({ ok: true }) : fail("Entry not found, or it is still running.", 404);
});
