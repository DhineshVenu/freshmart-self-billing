import { Router } from "express";
import { adminDashboardController } from "../controllers/AdminDashboardController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", authenticateToken, requireRole("admin"), adminDashboardController.getSummary);
router.delete("/demo-data", authenticateToken, requireRole("admin"), adminDashboardController.resetDemoData);

export default router;
