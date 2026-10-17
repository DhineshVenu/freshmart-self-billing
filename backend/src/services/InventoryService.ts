import mongoose from "mongoose";
import { InventoryAlert, IInventoryAlert } from "../models/InventoryAlert.js";
import { Product } from "../models/Product.js";
import { AuditLog } from "../models/AuditLog.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";
import { mailService } from "./MailService.js";

export interface AlertResponseDto {
  _id: string;
  productId: string;
  productName: string;
  barcode: string;
  storeId?: string | null;
  reorderLevel: number;
  currentQty: number;
  lastAlertedAt?: Date | null;
  alertEnabled: boolean;
}

export interface StockReportItem {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  stockQty: number;
  reorderLevel: number;
  storeId?: string | null;
}

// Re-alert throttle: 4 hours
const ALERT_THROTTLE_MS = 4 * 60 * 60 * 1000;

@Singleton
export class InventoryService {
  @LogExecution
  async setThreshold(
    productId: string,
    reorderLevel: number,
    storeId?: string,
    alertEmail?: string
  ): Promise<IInventoryAlert> {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const filter = {
      productId: new mongoose.Types.ObjectId(productId),
      storeId: storeId ? new mongoose.Types.ObjectId(storeId) : null,
    };

    const alert = await InventoryAlert.findOneAndUpdate(
      filter,
      {
        $set: {
          reorderLevel,
          alertEnabled: true,
          ...(alertEmail ? { alertEmail } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditLog.create({
      actorId: "admin",
      actorRole: "admin",
      action: "SET_REORDER_THRESHOLD",
      targetType: "Product",
      targetId: productId,
      details: `Reorder level set to ${reorderLevel} for ${product.name}`,
    });

    return alert;
  }

  /**
   * Called by CheckoutService after stock decrement.
   * Fires an alert email if currentQty <= reorderLevel and not throttled.
   */
  @LogExecution
  async checkAndAlert(
    productId: string,
    storeId: string | null,
    currentQty: number
  ): Promise<void> {
    const filter = {
      productId: new mongoose.Types.ObjectId(productId),
      storeId: storeId ? new mongoose.Types.ObjectId(storeId) : null,
      alertEnabled: true,
    };

    const alertConfig = await InventoryAlert.findOne(filter);
    if (!alertConfig) return; // No threshold configured — nothing to check

    if (currentQty > alertConfig.reorderLevel) return; // Stock still above threshold

    // Throttle check
    const now = Date.now();
    if (
      alertConfig.lastAlertedAt &&
      now - alertConfig.lastAlertedAt.getTime() < ALERT_THROTTLE_MS
    ) {
      return; // Already alerted recently
    }

    // Update lastAlertedAt first (prevents duplicate fires in race conditions)
    alertConfig.lastAlertedAt = new Date();
    alertConfig.acknowledgedBy = null;
    alertConfig.acknowledgedAt = null;
    await alertConfig.save();

    // Fetch product for alert email
    const product = await Product.findById(productId).select("name barcode").lean();
    if (!product) return;

    // Determine alert recipient
    const recipientEmail =
      alertConfig.alertEmail ||
      process.env.ADMIN_ALERT_EMAIL ||
      "admin@freshmart.com";

    // Fire alert email via existing MailService
    mailService
      .sendLowStockAlert(
        product.name,
        product.barcode,
        currentQty,
        alertConfig.reorderLevel,
        recipientEmail
      )
      .catch((err) => {
        console.error(`⚠️ Low-stock alert email failed for ${product.name}:`, err);
      });

    console.log(
      `📦 Low-stock alert fired: ${product.name} (qty ${currentQty} ≤ reorder ${alertConfig.reorderLevel})`
    );
  }

  @LogExecution
  async getActiveAlerts(storeId?: string): Promise<AlertResponseDto[]> {
    const filter: Record<string, unknown> = {
      alertEnabled: true,
      acknowledgedAt: null,
    };
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const alerts = await InventoryAlert.find(filter)
      .populate<{ productId: { _id: mongoose.Types.ObjectId; name: string; barcode: string; stockQty: number } }>(
        "productId",
        "name barcode stockQty"
      )
      .sort({ lastAlertedAt: -1 })
      .lean();

    return alerts
      .filter((a) => a.productId != null)
      .map((a) => ({
        _id: a._id.toString(),
        productId: a.productId._id.toString(),
        productName: a.productId.name,
        barcode: a.productId.barcode,
        storeId: a.storeId ? a.storeId.toString() : null,
        reorderLevel: a.reorderLevel,
        currentQty: a.productId.stockQty,
        lastAlertedAt: a.lastAlertedAt ?? null,
        alertEnabled: a.alertEnabled,
      }));
  }

  @LogExecution
  @ValidateInput
  async acknowledgeAlert(alertId: string, adminId: string): Promise<void> {
    const alert = await InventoryAlert.findById(alertId);
    if (!alert) throw new Error("Alert not found");
    alert.acknowledgedBy = adminId;
    alert.acknowledgedAt = new Date();
    await alert.save();
  }

  @LogExecution
  async getStockReport(storeId?: string): Promise<StockReportItem[]> {
    const productFilter: Record<string, unknown> = { active: true };
    if (storeId) productFilter.storeId = new mongoose.Types.ObjectId(storeId);

    const products = await Product.find(productFilter)
      .select("_id name barcode category stockQty storeId")
      .lean();

    const productIds = products.map((p) => p._id);
    const alerts = await InventoryAlert.find({
      productId: { $in: productIds },
      ...(storeId ? { storeId: new mongoose.Types.ObjectId(storeId) } : {}),
    })
      .select("productId reorderLevel")
      .lean();

    const thresholdMap = new Map(
      alerts.map((a) => [a.productId.toString(), a.reorderLevel])
    );

    return products.map((p) => ({
      productId: p._id.toString(),
      name: p.name,
      barcode: p.barcode,
      category: p.category || "General",
      stockQty: p.stockQty,
      reorderLevel: thresholdMap.get(p._id.toString()) ?? 0,
      storeId: p.storeId ? p.storeId.toString() : null,
    }));
  }
}

export const inventoryService = new InventoryService();
