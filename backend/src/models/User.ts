import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "customer" | "worker" | "admin" | "store_manager";
export type UserStatus = "active" | "disabled";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  /** For workers and store_managers: their assigned store ObjectId */
  assignedStoreId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "worker", "admin", "store_manager"],
      default: "customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      required: true,
    },
    assignedStoreId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
