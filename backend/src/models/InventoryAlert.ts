import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryAlert extends Document {
  productId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId | null;
  reorderLevel: number;
  lastAlertedAt?: Date | null;
  alertEnabled: boolean;
  alertEmail?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryAlertSchema = new Schema<IInventoryAlert>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    reorderLevel: { type: Number, required: true, min: 0, default: 10 },
    lastAlertedAt: { type: Date, default: null },
    alertEnabled: { type: Boolean, default: true },
    alertEmail: { type: String, default: null, trim: true, lowercase: true },
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound unique index: one alert config per product per store
InventoryAlertSchema.index({ productId: 1, storeId: 1 }, { unique: true });

export const InventoryAlert = mongoose.model<IInventoryAlert>(
  "InventoryAlert",
  InventoryAlertSchema
);
export default InventoryAlert;
