import mongoose, { Document, Schema } from "mongoose";

export interface IPushToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: "ios" | "android";
  active: boolean;
  registeredAt: Date;
  updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    registeredAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

// One active token per user per platform
PushTokenSchema.index({ userId: 1, platform: 1 }, { unique: false });
// Unique token values
PushTokenSchema.index({ token: 1 }, { unique: true, sparse: true });

export const PushToken = mongoose.model<IPushToken>("PushToken", PushTokenSchema);
export default PushToken;
