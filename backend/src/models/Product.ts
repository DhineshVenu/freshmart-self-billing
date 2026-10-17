import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  barcode: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
  price: number; // Stored in major units (INR ₹)
  stockQty: number;
  active: boolean;
  imageUrl?: string;
  storeId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    barcode: {
      type: String,
      required: [true, "Barcode is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      default: "General",
      trim: true,
    },
    unit: {
      type: String,
      default: "1 unit",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    stockQty: {
      type: Number,
      required: [true, "Stock quantity is required"],
      default: 100,
      min: [0, "Stock cannot be negative"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model<IProduct>("Product", productSchema);

export { Product };
export default Product;
