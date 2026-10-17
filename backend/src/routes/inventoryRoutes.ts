import { Router } from "express";
import { InventoryController } from "../controllers/InventoryController.js";
import { authenticateToken, requireRole } from "../middleware/index.js";

const router = Router();
const ctrl = new InventoryController();

// GET /api/v1/inventory/alerts
router.get("/alerts", authenticateToken, requireRole("admin", "store_manager"), ctrl.getAlerts);

// GET /api/v1/inventory/alerts/:storeId
router.get("/alerts/:storeId", authenticateToken, requireRole("admin", "store_manager"), ctrl.getAlertsByStore);

// GET /api/v1/inventory/stock-report
router.get("/stock-report", authenticateToken, requireRole("admin", "store_manager"), ctrl.getStockReport);

// PATCH /api/v1/inventory/:productId/threshold
router.patch("/:productId/threshold", authenticateToken, requireRole("admin"), ctrl.setThreshold);

// POST /api/v1/inventory/alerts/:alertId/acknowledge
router.post("/alerts/:alertId/acknowledge", authenticateToken, requireRole("admin", "store_manager"), ctrl.acknowledgeAlert);

export default router;
