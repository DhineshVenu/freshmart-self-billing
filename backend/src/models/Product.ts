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
  // In-Store Wayfinding & Shelf Location
  aisle?: string;
  shelf?: string;
  bay?: number;
  mapCoordinates?: { x: number; y: number };
  // Dietary, Allergen & Nutri-Score
  nutriScore?: "A" | "B" | "C" | "D" | "E";
  allergens?: string[];
  dietaryFlags?: string[];
  calories?: number;
  // Dynamic Expiry & Clearance Pricing
  expiryDate?: Date;
  clearanceDiscountPercent?: number;
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
    aisle: {
      type: String,
      default: "Aisle 1 - General",
      trim: true,
    },
    shelf: {
      type: String,
      default: "Shelf A",
      trim: true,
    },
    bay: {
      type: Number,
      default: 1,
    },
    mapCoordinates: {
      x: { type: Number, default: 20 },
      y: { type: Number, default: 20 },
    },
    nutriScore: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
      default: "B",
    },
    allergens: {
      type: [String],
      default: [],
    },
    dietaryFlags: {
      type: [String],
      default: ["Vegetarian"],
    },
    calories: {
      type: Number,
      default: 120,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    clearanceDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model<IProduct>("Product", productSchema);

export { Product };
export default Product;
