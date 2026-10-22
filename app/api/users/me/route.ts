import { fail, json, route } from "@/lib/server/api";
import { toUser } from "@/lib/server/serialize";
import { User } from "@/models/User";

export const PATCH = route(async (req, me) => {
  const b = await req.json();
  const patch: Record<string, string> = {};
  for (const k of ["name", "phone", "department", "designation"]) {
    if (typeof b[k] === "string") patch[k] = b[k].trim();
  }
  if ("name" in patch && !patch.name) return fail("Name is required");
  const user = await User.findByIdAndUpdate(me.id, patch, { new: true }).lean();
  return json({ user: toUser(user) });
});
