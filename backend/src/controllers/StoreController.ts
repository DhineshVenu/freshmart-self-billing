import { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { StoreService } from "../services/StoreService.js";

export class StoreController extends BaseController {
  private readonly storeService = new StoreService();

  public getAllStores = async (_req: Request, res: Response): Promise<void> => {
    try {
      const stores = await this.storeService.getAllStores();
      this.sendSuccess(res, stores);
    } catch (err) {
      this.sendError(res, (err as Error).message, 400);
    }
  };

  public createStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const store = await this.storeService.createStore(req.body as { name: string; address?: string; city?: string; gstNumber?: string });
      this.sendSuccess(res, store, 201);
    } catch (err) {
      this.sendError(res, (err as Error).message, 400);
    }
  };

  public getStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const store = await this.storeService.getStoreById(String(req.params.storeId));
      this.sendSuccess(res, store);
    } catch (err) {
      this.sendError(res, (err as Error).message, 404);
    }
  };

  public updateStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const store = await this.storeService.updateStore(String(req.params.storeId), req.body as Record<string, unknown>);
      this.sendSuccess(res, store);
    } catch (err) {
      this.sendError(res, (err as Error).message, 400);
    }
  };

  public assignManager = async (req: Request, res: Response): Promise<void> => {
    try {
      const store = await this.storeService.assignManager(
        String(req.params.storeId),
        String((req.body as { managerId: string }).managerId)
      );
      this.sendSuccess(res, store);
    } catch (err) {
      this.sendError(res, (err as Error).message, 400);
    }
  };

  public getKPIs = async (req: Request, res: Response): Promise<void> => {
    try {
      const kpis = await this.storeService.getStoreKPIs(String(req.params.storeId));
      this.sendSuccess(res, kpis);
    } catch (err) {
      this.sendError(res, (err as Error).message, 400);
    }
  };
}
