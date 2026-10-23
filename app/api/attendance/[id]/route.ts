import { isValidObjectId } from "mongoose";
import { DATE_RE, fail, json, route } from "@/lib/server/api";
import { findOverlap, istToday, parseEntry } from "@/lib/server/manual";
import { Attendance } from "@/models/Attendance";

/**
 * Edit a session. Body: { date, punchIn, punchOut?, breakMinutes? }.
 * - With punchOut: replaces the session's times and break (closes it if it was running).
 * - Without punchOut, on a running session: the in time and (optionally) the break total are changed;
 *   it keeps running. A break that is in progress right now is left as is.
 *
 * Admins can edit any employee's session on any date. Employees can edit only their own session
 * for today, or their own session left running from an earlier day (so it can be closed).
 */
export const PATCH = route(async (req, me, ctx: RouteContext<"/api/attendance/[id]">) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("Invalid request");
  const body = await req.json();

  const existing = await Attendance.findById(id).select("userId date punchOut breaks")
    .lean<{ userId: unknown; date: string; punchOut?: Date; breaks?: { start: Date; end?: Date }[] }>();
  const admin = me.role === "admin";
  if (!existing || (!admin && String(existing.userId) !== me.id)) return fail("Entry not found.", 404);

  const running = !existing.punchOut;
  if (!admin) {
    const today = istToday();
    const ok =
      (existing.date === today && (body.date ?? today) === today) || (running && body.date === existing.date);
    if (!ok) return fail("You can only edit today's entry here. Ask an admin to change other dates.", 403);
  }

  const owner = String(existing.userId);

  if (running && !body.punchOut) {
    const punchIn = new Date(String(body.punchIn ?? ""));
    const date = String(body.date ?? "");
    if (!DATE_RE.test(date) || isNaN(punchIn.getTime())) return fail("Enter a valid in time.");
    const now = new Date();
    if (punchIn >= now) return fail("In time must be in the past.");
    if (await findOverlap(owner, { date, punchIn, punchOut: now, breaks: [] }, id)) {
      return fail("This overlaps another entry on the same day.", 409);
    }
    const set: Record<string, unknown> = { date, punchIn, manual: true };
    if (body.breakMinutes !== undefined) {
      const breakMin = Number(body.breakMinutes);
      if (!Number.isFinite(breakMin) || breakMin < 0) return fail("Break must be 0 or more minutes.");
      // Replace the finished breaks with one block; keep a break that is in progress right now.
      const inProgress = (existing.breaks ?? []).filter((b) => !b.end);
      const limit = inProgress[0] ? new Date(inProgress[0].start).getTime() : now.getTime();
      const available = limit - punchIn.getTime();
      if (breakMin * 60_000 > available) return fail("Break cannot be longer than the time since the in time.");
      const start = punchIn.getTime() + (available - breakMin * 60_000) / 2;
      set.breaks = [
        ...(breakMin > 0 ? [{ start: new Date(start), end: new Date(start + breakMin * 60_000) }] : []),
        ...inProgress,
      ];
    }
    await Attendance.updateOne({ _id: id }, { $set: set }); // the UI reloads afterwards; nothing to send back
    return json({ ok: true });
  }

  const e = parseEntry(body);
  if (typeof e === "string") return fail(e);
  if (await findOverlap(owner, e, id)) return fail("This overlaps another entry on the same day.", 409);
  await Attendance.updateOne({ _id: id }, { $set: { ...e, manual: true }, $unset: { open: "" } });
  return json({ ok: true });
});

/** Delete one of your own finished sessions. */
export const DELETE = route(async (_req, me, ctx: RouteContext<"/api/attendance/[id]">) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail("Invalid request");
  const filter = me.role === "admin" ? { _id: id } : { _id: id, userId: me.id };
  const r = await Attendance.deleteOne({ ...filter, punchOut: { $exists: true } });
  return r.deletedCount ? json({ ok: true }) : fail("Entry not found, or it is still running.", 404);
});
