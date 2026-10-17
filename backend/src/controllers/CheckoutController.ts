import { Response } from "express";
import { BaseController } from "./BaseController.js";
import { checkoutService } from "../services/CheckoutService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class CheckoutController extends BaseController {
  checkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionCode, paymentMethod } = req.body;
      if (!sessionCode) {
        this.sendError(res, "Shopping session code is required for checkout.", 400);
        return;
      }

      const result = await checkoutService.processCheckout(sessionCode, paymentMethod || "UPI");
      this.sendSuccess(res, result, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed.";
      this.sendError(res, msg, 400);
    }
  };

  confirmPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        this.sendError(res, "Order ID is required to confirm payment.", 400);
        return;
      }

      const confirmedBy = req.user ? `${req.user.name} (${req.user.role})` : "Worker POS";
      const result = await checkoutService.confirmPayment(orderId, confirmedBy);
      this.sendSuccess(res, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment confirmation failed.";
      this.sendError(res, msg, 400);
    }
  };

  getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const orderId = Array.isArray(id) ? id[0] : id;
      const order = await checkoutService.getOrderById(orderId);

      if (!order) {
        this.sendError(res, "Order bill not found.", 404);
        return;
      }

      this.sendSuccess(res, { order });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch order bill.";
      this.sendError(res, msg, 500);
    }
  };

  getAllOrders = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orders = await checkoutService.getAllOrders();
      this.sendSuccess(res, { orders });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch orders list.";
      this.sendError(res, msg, 500);
    }
  };

  sendReceiptEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const orderId = Array.isArray(id) ? id[0] : id;
      const { email } = req.body;

      const result = await checkoutService.sendReceiptEmail(orderId, email);
      this.sendSuccess(res, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send receipt email.";
      this.sendError(res, msg, 400);
    }
  };

  getOrdersBySession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionCode } = req.params;
      const code = Array.isArray(sessionCode) ? sessionCode[0] : sessionCode;
      const orders = await checkoutService.getOrdersBySession(code);
      this.sendSuccess(res, { orders });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch session orders.";
      this.sendError(res, msg, 500);
    }
  };

  /** GET /api/v1/orders/mine — Mobile customer's own paid orders */
  getMyOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.userId;
      if (!customerId) {
        this.sendError(res, "Authentication required", 401);
        return;
      }
      const orders = await checkoutService.getOrdersByCustomer(customerId);
      this.sendSuccess(res, { orders });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch order history.";
      this.sendError(res, msg, 500);
    }
  };
}

export const checkoutController = new CheckoutController();
