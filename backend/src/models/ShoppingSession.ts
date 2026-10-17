import mongoose, { Document, Schema } from "mongoose";
import { randomUUID } from "node:crypto";

export type SessionStatus = "ACTIVE" | "CHECKOUT_PENDING" | "COMPLETED" | "CANCELLED";

export interface IShoppingSession extends Document {
  sessionCode: string;
  storeName: string;
  /** ObjectId reference to the User (role: worker) who created this session. */
  workerId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId | null;
  status: SessionStatus;
  joinedCustomerId?: mongoose.Types.ObjectId | null;
  joinedCustomerName?: string | null;
  joinedCustomerEmail?: string | null;
  joinedAt?: Date | null;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const shoppingSessionSchema = new Schema<IShoppingSession>(
  {
    sessionCode: {
      type: String,
      required: true,
      unique: true,
      default: () => randomUUID(),
    },
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CHECKOUT_PENDING", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
    },
    joinedCustomerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    joinedCustomerName: {
      type: String,
      default: null,
      trim: true,
    },
    joinedCustomerEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ShoppingSession = mongoose.model<IShoppingSession>(
  "ShoppingSession",
  shoppingSessionSchema
);

export { ShoppingSession };
export default ShoppingSession;
