import mongoose, { Schema } from "mongoose";

const leaveSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["Casual", "Sick", "Paid", "Unpaid"], required: true },
    from: { type: String, required: true }, // YYYY-MM-DD
    to: { type: String, required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// "My leaves", newest first.
leaveSchema.index({ userId: 1, createdAt: -1 });
// Admin "all leaves" list (newest first) without a collection scan + sort.
leaveSchema.index({ createdAt: -1 });
// Admin approval queue.
leaveSchema.index({ status: 1, createdAt: -1 });

export const Leave = mongoose.models.Leave ?? mongoose.model("Leave", leaveSchema);
