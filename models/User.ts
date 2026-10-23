import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    department: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

// Admin employee list sorted by join date.
userSchema.index({ createdAt: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
