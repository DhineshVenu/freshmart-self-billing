import { Response } from "express";
import { BaseController } from "./BaseController.js";
import { PushNotificationService } from "../services/PushNotificationService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class PushController extends BaseController {
  private readonly pushService = new PushNotificationService();

  /** POST /api/v1/push/register */
  public register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        this.sendError(res, "Authentication required", 401);
        return;
      }
      const { token, platform } = req.body as { token: string; platform: "ios" | "android" };
      if (!token?.trim()) {
        this.sendError(res, "Push token is required", 400);
        return;
      }
      await this.pushService.registerToken(userId, token.trim(), platform ?? "android");
      this.sendSuccess(res, { registered: true }, 200, "Push token registered");
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };

  /** DELETE /api/v1/push/deregister */
  public deregister = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        this.sendError(res, "Authentication required", 401);
        return;
      }
      await this.pushService.deregisterTokens(userId);
      this.sendSuccess(res, { deregistered: true });
    } catch (err) {
      this.sendError(res, (err as Error).message);
    }
  };
}
