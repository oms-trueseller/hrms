import mongoose, { Schema } from "mongoose";

/** One punch-in/punch-out pair. A day can have several. */
const attendanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD, employee's local day of punch in
    punchIn: { type: Date, required: true },
    punchOut: { type: Date },
    // Set to true only while the session is open, so the partial unique index below
    // guarantees at most one open session per user (even under double-clicks / races).
    open: { type: Boolean },
    // True when the times were entered/edited by hand instead of punched live.
    manual: { type: Boolean },
    // `auto` marks the break that started by itself at the automatic break time.
    breaks: [{ _id: false, start: { type: Date, required: true }, end: Date, auto: Boolean }],
    // Set when an admin punched the employee in (who did it).
    openedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // Set when an admin punched the employee out (who did it).
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    // True once this session has had its automatic break (so it is never added twice).
    autoBreak: { type: Boolean },
    // Reasons given for breaks that took the day total past the limit. Kept apart from `breaks`,
    // so hand-edits to break totals never erase them.
    longBreaks: [
      { _id: false, at: Date, minutes: Number, totalMinutes: Number, reason: { type: String, maxlength: 200 } },
    ],
  },
  { timestamps: true },
);

// History by user and date range (month view, dashboard).
attendanceSchema.index({ userId: 1, date: -1 });
// Admin "everyone on a given day" view.
attendanceSchema.index({ date: 1 });
// At most one open session per user; also makes "find active session" an index hit.
attendanceSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { open: true } });
// Admin live-status lookup of all open sessions.
attendanceSchema.index({ open: 1 }, { partialFilterExpression: { open: true } });

export const Attendance = mongoose.models.Attendance ?? mongoose.model("Attendance", attendanceSchema);
