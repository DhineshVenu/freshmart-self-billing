import { Response } from "express";
import { BaseController } from "./BaseController.js";
import { User } from "../models/User.js";
import Product from "../models/Product.js";
import ShoppingSession from "../models/ShoppingSession.js";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { Payment } from "../models/Payment.js";
import { AuditLog } from "../models/AuditLog.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class AdminDashboardController extends BaseController {
  getSummary = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        totalWorkers,
        totalProducts,
        lowStockProducts,
        activeSessions,
        completedOrders,
        salesAgg,
        recentAuditLogs,
      ] = await Promise.all([
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "worker" }),
        Product.countDocuments({ active: true }),
        Product.find({ active: true, stockQty: { $lte: 5 } }),
        ShoppingSession.countDocuments({ status: "ACTIVE" }),
        Order.countDocuments({ status: "PAID" }),
        Order.aggregate([
          { $match: { status: "PAID" } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
        ]),
        AuditLog.find().sort({ timestamp: -1 }).limit(10),
      ]);

      const totalRevenue = salesAgg.length > 0 ? salesAgg[0].totalRevenue : 0;

      this.sendSuccess(res, {
        summary: {
          totalUsers,
          totalWorkers,
          totalProducts,
          lowStockCount: lowStockProducts.length,
          lowStockProducts,
          activeSessions,
          completedOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
        },
        recentAuditLogs,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard summary.";
      this.sendError(res, msg, 500);
    }
  };

  resetDemoData = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const [sessions, carts, orders, payments, auditLogs] = await Promise.all([
        ShoppingSession.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
        Payment.deleteMany({}),
        AuditLog.deleteMany({}),
      ]);

      this.sendSuccess(res, {
        deleted: {
          sessions: sessions.deletedCount ?? 0,
          carts: carts.deletedCount ?? 0,
          orders: orders.deletedCount ?? 0,
          payments: payments.deletedCount ?? 0,
          auditLogs: auditLogs.deletedCount ?? 0,
        },
      }, 200, "Demo data reset successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset demo data.";
      this.sendError(res, msg, 500);
    }
  };
}

export const adminDashboardController = new AdminDashboardController();
