import { Router } from "express";
import { StoreController } from "../controllers/StoreController.js";
import { authenticateToken, requireRole } from "../middleware/index.js";

const router = Router();
const ctrl = new StoreController();

// GET /api/v1/stores
router.get("/", authenticateToken, requireRole("admin", "store_manager"), ctrl.getAllStores);

// POST /api/v1/stores
router.post("/", authenticateToken, requireRole("admin"), ctrl.createStore);

// GET /api/v1/stores/:storeId
router.get("/:storeId", authenticateToken, requireRole("admin", "store_manager"), ctrl.getStore);

// PATCH /api/v1/stores/:storeId
router.patch("/:storeId", authenticateToken, requireRole("admin"), ctrl.updateStore);

// POST /api/v1/stores/:storeId/assign-manager
router.post("/:storeId/assign-manager", authenticateToken, requireRole("admin"), ctrl.assignManager);

// GET /api/v1/stores/:storeId/kpis
router.get("/:storeId/kpis", authenticateToken, requireRole("admin", "store_manager"), ctrl.getKPIs);

export default router;
