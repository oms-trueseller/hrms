import { isValidObjectId } from "mongoose";
import { DATE_RE, fail, json, route } from "@/lib/server/api";
import { findOverlap, istToday, parseEntry } from "@/lib/server/manual";
import { User } from "@/models/User";
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

/**
 * POST { action: punchIn | punchOut | startBreak | endBreak | manual, date?: YYYY-MM-DD, userId?: admin only }
 * Times are server time. Admins may pass userId to start/end a break for an employee.
 */
export const POST = route(async (req, me) => {
  const body = await req.json();
  const { action, date } = body;
  const now = new Date();
  const mine = { userId: me.id, open: true };
  // Break actions: an admin may pass userId to start/end a break for an employee.
  const breakTarget = me.role === "admin" && body.userId ? String(body.userId) : me.id;
  const theirs = { userId: breakTarget, open: true };
  const endOpenBreaks = { arrayFilters: [{ "b.end": { $exists: false } }] };

  switch (action) {
    case "manual": {
      const e = parseEntry(body);
      if (typeof e === "string") return fail(e);
      // Employees may only add today's entry for themselves; admins may add any date for anyone.
      const admin = me.role === "admin";
      if (!admin && e.date !== istToday()) return fail("Only an admin can add entries for other dates.", 403);
      const target = admin && body.userId ? String(body.userId) : me.id;
      if (!isValidObjectId(target) || !(await User.exists({ _id: target }))) return fail("Employee not found.", 404);
      if (await findOverlap(target, e)) return fail("This overlaps another entry on the same day.", 409);
      const s = await Attendance.create({ userId: target, ...e, manual: true });
      return json({ session: toSession(s) }, 201);
    }
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
      if (!isValidObjectId(breakTarget)) return fail("Invalid userId");
      const s = await Attendance.findOneAndUpdate(
        { ...theirs, breaks: { $not: { $elemMatch: { end: { $exists: false } } } } },
        { $push: { breaks: { start: now } } },
        { new: true },
      ).lean();
      return s ? json({ session: toSession(s) }) : fail("Cannot start a break right now.", 409);
    }
    case "endBreak": {
      if (!isValidObjectId(breakTarget)) return fail("Invalid userId");
      const s = await Attendance.findOneAndUpdate(
        // $elemMatch: true when some break has no end. A plain "breaks.end" $exists:false stops matching
        // as soon as any earlier break has ended, which made later breaks impossible to end.
        { ...theirs, breaks: { $elemMatch: { end: { $exists: false } } } },
        { $set: { "breaks.$[b].end": now } },
        { new: true, ...endOpenBreaks },
      ).lean();
      return s ? json({ session: toSession(s) }) : fail("You are not on a break.", 409);
    }
    default:
      return fail("Unknown action");
  }
});
