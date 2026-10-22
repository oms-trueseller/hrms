import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

// Cache the connection across hot reloads / serverless invocations.
const g = globalThis as unknown as { _mongoose?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } };
const cached = (g._mongoose ??= {});

export async function connectDB() {
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.local)");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = undefined;
    throw e;
  }
  return cached.conn;
}
