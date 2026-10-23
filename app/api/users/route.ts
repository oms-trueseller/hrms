import { json, route } from "@/lib/server/api";
import { toUserListItem, USER_LIST_FIELDS } from "@/lib/server/serialize";
import { User } from "@/models/User";

/** Admin employee list: only the fields that page shows (no phone). */
export const GET = route(
  async () => {
    const users = await User.find().select(USER_LIST_FIELDS).sort({ createdAt: 1 }).lean();
    return json({ users: users.map(toUserListItem) });
  },
  { admin: true },
);
