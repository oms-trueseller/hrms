import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

// Cache the connection across hot reloads / serverless invocations.
const g = globalThis as unknown as { _mongoose?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } };
const cached = (g._mongoose ??= {});

export async function connectDB() {
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.local)");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri, {
    maxPoolSize: 10,
    // Keep a couple of connections open so a request after a quiet period doesn't pay for a new TLS handshake.
    minPoolSize: 2,
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
  return cached.conn;
}
