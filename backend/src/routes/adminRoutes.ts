import { Router } from "express";
import { adminDashboardController } from "../controllers/AdminDashboardController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", authenticateToken, requireRole("admin"), adminDashboardController.getSummary);
router.get("/customers", authenticateToken, requireRole("admin"), adminDashboardController.getCustomers);
router.patch("/customers/:id/points", authenticateToken, requireRole("admin"), adminDashboardController.updateCustomerPoints);
router.delete("/demo-data", authenticateToken, requireRole("admin"), adminDashboardController.resetDemoData);

export default router;
