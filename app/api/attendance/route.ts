import { isValidObjectId } from "mongoose";
import { DATE_RE, fail, json, route } from "@/lib/server/api";
import { toSession } from "@/lib/server/serialize";
import { Attendance } from "@/models/Attendance";

/**
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=<id>|all]
 * Employees always get their own records; admins may pass userId or "all".
 * Any open session in scope is always included, even if it started before `from`.
 */
export const GET = route(async (req, me) => {
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? from;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return fail("from/to must be YYYY-MM-DD");

  const filter: Record<string, unknown> = {
    $or: [{ date: { $gte: from, $lte: to } }, { open: true }],
  };
  const target = me.role === "admin" ? (q.get("userId") ?? me.id) : me.id;
  if (target !== "all") {
    if (!isValidObjectId(target)) return fail("Invalid userId");
    filter.userId = target;
  }

  const rows = await Attendance.find(filter).sort({ punchIn: 1 }).lean();
  return json({ sessions: rows.map(toSession) });
});

/** POST { action: punchIn | punchOut | startBreak | endBreak, date?: YYYY-MM-DD } — times are server time. */
export const POST = route(async (req, me) => {
  const { action, date } = await req.json();
  const now = new Date();
  const mine = { userId: me.id, open: true };
  const endOpenBreaks = { arrayFilters: [{ "b.end": { $exists: false } }] };

  switch (action) {
    case "punchIn": {
      if (!DATE_RE.test(date ?? "")) return fail("date is required");
      try {
        const s = await Attendance.create({ userId: me.id, date, punchIn: now, open: true, breaks: [] });
        return json({ session: toSession(s) }, 201);
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return fail("You are already punched in.", 409);
        throw e;
      }
    }
    case "punchOut": {
      const s = await Attendance.findOneAndUpdate(
        mine,
        { $set: { punchOut: now, "breaks.$[b].end": now }, $unset: { open: "" } },
        { new: true, ...endOpenBreaks },
      ).lean();
      return s ? json({ session: toSession(s) }) : fail("You are not punched in.", 409);
    }
    case "startBreak": {
      const s = await Attendance.findOneAndUpdate(
        { ...mine, breaks: { $not: { $elemMatch: { end: { $exists: false } } } } },
        { $push: { breaks: { start: now } } },
        { new: true },
      ).lean();
      return s ? json({ session: toSession(s) }) : fail("Cannot start a break right now.", 409);
    }
    case "endBreak": {
      const s = await Attendance.findOneAndUpdate(
        { ...mine, "breaks.end": { $exists: false } },
        { $set: { "breaks.$[b].end": now } },
        { new: true, ...endOpenBreaks },
      ).lean();
      return s ? json({ session: toSession(s) }) : fail("You are not on a break.", 409);
    }
    default:
      return fail("Unknown action");
  }
});
