import { Router } from "express";
import { checkoutController } from "../controllers/CheckoutController.js";
import { authenticateToken } from "../middleware/index.js";

const router = Router();

router.post("/checkout", checkoutController.checkout);
router.post("/payments/confirm", checkoutController.confirmPayment);
router.get("/orders", checkoutController.getAllOrders);
// Mobile: customer's own order history (paginated)
router.get("/orders/mine", authenticateToken, checkoutController.getMyOrders);
router.get("/orders/session/:sessionCode", checkoutController.getOrdersBySession);
router.get("/orders/:id", checkoutController.getOrder);
router.post("/orders/:id/send-receipt", checkoutController.sendReceiptEmail);

export default router;
