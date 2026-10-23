import { DATE_RE, fail, json, route } from "@/lib/server/api";
import { LEAVE_FIELDS, LEAVE_SPAN_FIELDS, toLeave, toLeaveSpan } from "@/lib/server/serialize";
import { Leave } from "@/models/Leave";

const TYPES = ["Casual", "Sick", "Paid", "Unpaid"];

/**
 * GET                        → my leaves (id, type, from, to, reason, status), newest first.
 * GET ?scope=all             → everyone's (admin), pending first, each with userId.
 * GET ?view=calendar         → only approved leaves as { from, to, status }, for marking "On leave" days.
 *                              Combine with scope=all (admin) to also get userId.
 */
export const GET = route(async (req, me) => {
  const q = new URL(req.url).searchParams;
  const all = q.get("scope") === "all";
  const calendar = q.get("view") === "calendar";
  if (all && me.role !== "admin") return fail("Admin access required", 403);

  const filter: Record<string, unknown> = all ? {} : { userId: me.id };
  if (calendar) filter.status = "approved";

  const fields = (calendar ? LEAVE_SPAN_FIELDS : LEAVE_FIELDS) + (all ? " userId" : "");
  const rows = await Leave.find(filter).select(fields).sort({ createdAt: -1 }).limit(1000).lean();

  if (calendar) return json({ leaves: rows.map((l) => toLeaveSpan(l, all)) });
  // Admin queue: pending first. Array sort is stable, so each group stays newest-first.
  if (all) rows.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  return json({ leaves: rows.map((l) => toLeave(l, all)) });
});

export const POST = route(async (req, me) => {
  const b = await req.json();
  const reason = String(b.reason ?? "").trim();
  if (!TYPES.includes(b.type) || !DATE_RE.test(b.from) || !DATE_RE.test(b.to) || !reason) {
    return fail("Invalid leave request");
  }
  if (b.to < b.from) return fail("End date cannot be before start date.");
  await Leave.create({ userId: me.id, type: b.type, from: b.from, to: b.to, reason });
  return json({ ok: true }, 201);
});
