import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  orderId: string;
  orderNo: string;
  amount: number;
  method: "UPI" | "CASH" | "CARD";
  status: "SUCCESS" | "PENDING" | "FAILED";
  idempotencyKey?: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: String, required: true },
    orderNo: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["UPI", "CASH", "CARD"], required: true },
    status: {
      type: String,
      enum: ["SUCCESS", "PENDING", "FAILED"],
      default: "PENDING",
      required: true,
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
    confirmedBy: { type: String, default: "System" },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
