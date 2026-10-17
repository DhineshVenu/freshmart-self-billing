import { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { InventoryService } from "../services/InventoryService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class InventoryController extends BaseController {
  private readonly inventoryService = new InventoryService();

  public getAlerts = async (_req: Request, res: Response): Promise<void> => {
    try {
      const alerts = await this.inventoryService.getActiveAlerts();
      this.sendSuccess(res, alerts);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public getAlertsByStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const alerts = await this.inventoryService.getActiveAlerts(String(req.params.storeId));
      this.sendSuccess(res, alerts);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public getStockReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
      const report = await this.inventoryService.getStockReport(storeId);
      this.sendSuccess(res, report);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public setThreshold = async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = String(req.params.productId);
      const body = req.body as { reorderLevel: number; storeId?: string; alertEmail?: string };
      const alert = await this.inventoryService.setThreshold(
        productId,
        body.reorderLevel,
        body.storeId,
        body.alertEmail
      );
      this.sendSuccess(res, alert);
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  public acknowledgeAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user?.userId ?? "system";
      await this.inventoryService.acknowledgeAlert(String(req.params.alertId), adminId);
      this.sendSuccess(res, { acknowledged: true });
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };
}
