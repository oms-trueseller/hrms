import { fail, json, route } from "@/lib/server/api";
import { invalidateMe } from "@/lib/server/auth";
import { toUser, USER_FIELDS } from "@/lib/server/serialize";
import { User } from "@/models/User";

export const PATCH = route(async (req, me) => {
  const b = await req.json();
  const patch: Record<string, string> = {};
  for (const k of ["name", "phone", "department", "designation"]) {
    if (typeof b[k] === "string") patch[k] = b[k].trim();
  }
  if ("name" in patch && !patch.name) return fail("Name is required");
  // The Profile page needs the whole profile back to refresh its cache.
  const user = await User.findByIdAndUpdate(me.id, patch, { new: true }).select(USER_FIELDS).lean();
  invalidateMe(me.id);
  return json({ user: toUser(user) });
});
