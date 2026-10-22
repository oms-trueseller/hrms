import { json, route } from "@/lib/server/api";
import { toUser } from "@/lib/server/serialize";
import { User } from "@/models/User";

export const GET = route(
  async () => {
    const users = await User.find().sort({ createdAt: 1 }).lean();
    return json({ users: users.map(toUser) });
  },
  { admin: true },
);
