/**
 * Runs once when the server starts. Opens the database connection straight away, so the first
 * person to load a page doesn't pay for the connection set-up (DNS lookup + TLS + login, ~0.4-1 s).
 * It is not awaited, so a database outage never stops the server from starting.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { connectDB } = await import("./lib/server/db");
  connectDB().catch((e: unknown) => console.error("Database warm-up failed:", e instanceof Error ? e.message : e));
}
