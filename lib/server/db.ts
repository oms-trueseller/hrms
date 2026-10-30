import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

/** Connections kept open and ready, so several requests at once (a page load fires a few) don't wait to connect. */
const WARM_CONNECTIONS = 4;
/** How often idle connections are touched, so routers and the database don't close them for being quiet. */
const KEEP_ALIVE_MS = 20_000;

// Cache the connection across hot reloads / serverless invocations.
const g = globalThis as unknown as {
  _mongoose?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> };
  _mongoKeepAlive?: ReturnType<typeof setInterval>;
};
const cached = (g._mongoose ??= {});

/**
 * Sends a few tiny pings at once, which keeps the whole warm set of connections busy enough to stay open
 * (and quietly reconnects any that dropped), so the next real request finds a ready connection instead of
 * waiting 0.4-1 s for a new one.
 */
function startKeepAlive(conn: typeof mongoose) {
  if (g._mongoKeepAlive) return;
  const ping = () =>
    Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => conn.connection.db?.command({ ping: 1 }))).catch(() => {});
  g._mongoKeepAlive = setInterval(ping, KEEP_ALIVE_MS);
  g._mongoKeepAlive.unref?.(); // never keeps the process alive on its own
  void ping();
}

export async function connectDB() {
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.local)");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: WARM_CONNECTIONS,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 30000,
    // Avoids slow IPv6 attempts on networks without IPv6 (common cause of a slow first connect).
    family: 4,
  });
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = undefined;
    throw e;
  }
  startKeepAlive(cached.conn);
  return cached.conn;
}
