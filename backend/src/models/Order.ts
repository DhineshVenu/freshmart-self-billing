import mongoose, { Document, Schema } from "mongoose";

export interface IOrderItemSnapshot {
  productId: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";
export type PaymentMethod = "UPI" | "CASH" | "CARD";

export interface IOrder extends Document {
  orderNo: string;
  sessionId: string;
  storeId?: mongoose.Types.ObjectId | null;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  storeName: string;
  items: IOrderItemSnapshot[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  receiptEmailSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: { type: String, required: true },
    barcode: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "General" },
    price: { type: Number, required: true },
    unit: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNo: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    customerId: { type: String, default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: null, trim: true, lowercase: true },
    storeName: { type: String, required: true, default: "Fresh Mart" },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "CASH", "CARD"],
    },
    paidAt: { type: Date },
    receiptEmailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
