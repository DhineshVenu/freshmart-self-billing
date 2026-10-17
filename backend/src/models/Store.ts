import mongoose, { Document, Schema } from "mongoose";

export interface IStore extends Document {
  name: string;
  address: string;
  city: string;
  gstNumber: string;
  managerId?: mongoose.Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    gstNumber: { type: String, default: "", trim: true },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Store = mongoose.model<IStore>("Store", StoreSchema);
export default Store;
