import { json } from "@/lib/server/api";
import { clearSessionCookie } from "@/lib/server/auth";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
