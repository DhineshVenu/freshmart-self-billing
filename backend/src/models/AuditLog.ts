import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    details: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
