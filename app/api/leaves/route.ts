import { DATE_RE, fail, json, route } from "@/lib/server/api";
import { toLeave } from "@/lib/server/serialize";
import { Leave } from "@/models/Leave";

const TYPES = ["Casual", "Sick", "Paid", "Unpaid"];

/** GET → my leaves. GET ?scope=all (admin) → everyone's. */
export const GET = route(async (req, me) => {
  const all = new URL(req.url).searchParams.get("scope") === "all";
  if (all && me.role !== "admin") return fail("Admin access required", 403);
  const rows = await Leave.find(all ? {} : { userId: me.id }).sort({ createdAt: -1 }).limit(1000).lean();
  return json({ leaves: rows.map(toLeave) });
});

export const POST = route(async (req, me) => {
  const b = await req.json();
  const reason = String(b.reason ?? "").trim();
  if (!TYPES.includes(b.type) || !DATE_RE.test(b.from) || !DATE_RE.test(b.to) || !reason) {
    return fail("Invalid leave request");
  }
  if (b.to < b.from) return fail("End date cannot be before start date.");
  const leave = await Leave.create({ userId: me.id, type: b.type, from: b.from, to: b.to, reason });
  return json({ leave: toLeave(leave) }, 201);
});
