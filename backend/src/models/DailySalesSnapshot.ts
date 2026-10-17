import mongoose, { Document, Schema } from "mongoose";

export interface ICategoryBreakdown {
  category: string;
  revenue: number;
  orders: number;
}

export interface IDailySalesSnapshot extends Document {
  storeId?: mongoose.Types.ObjectId | null;
  date: Date;           // midnight UTC of the day
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  categoryBreakdown: ICategoryBreakdown[];
  peakHour: number;     // 0-23, hour with highest order count
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryBreakdownSchema = new Schema<ICategoryBreakdown>(
  {
    category: { type: String, required: true },
    revenue: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
  },
  { _id: false }
);

const DailySalesSnapshotSchema = new Schema<IDailySalesSnapshot>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    categoryBreakdown: [CategoryBreakdownSchema],
    peakHour: { type: Number, default: 0, min: 0, max: 23 },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Compound unique index: one snapshot per store per day (idempotent upsert)
DailySalesSnapshotSchema.index({ storeId: 1, date: 1 }, { unique: true });

export const DailySalesSnapshot = mongoose.model<IDailySalesSnapshot>(
  "DailySalesSnapshot",
  DailySalesSnapshotSchema
);
export default DailySalesSnapshot;
