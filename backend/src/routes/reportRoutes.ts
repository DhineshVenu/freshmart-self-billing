import { Router } from "express";
import { ReportController } from "../controllers/ReportController.js";
import { authenticateToken, requireRole } from "../middleware/index.js";

const router = Router();
const ctrl = new ReportController();

// GET /api/v1/reports/daily?startDate=&endDate=&storeId=
router.get("/daily", authenticateToken, requireRole("admin", "store_manager"), ctrl.getDailyReport);

// GET /api/v1/reports/category?period=&storeId=
router.get("/category", authenticateToken, requireRole("admin", "store_manager"), ctrl.getCategoryReport);

// GET /api/v1/reports/peak-hours?period=&storeId=
router.get("/peak-hours", authenticateToken, requireRole("admin", "store_manager"), ctrl.getPeakHourReport);

// GET /api/v1/reports/export/csv?startDate=&endDate=&storeId=
router.get("/export/csv", authenticateToken, requireRole("admin"), ctrl.exportCsv);

// GET /api/v1/reports/export/pdf?startDate=&endDate=&storeId=
router.get("/export/pdf", authenticateToken, requireRole("admin"), ctrl.exportPdf);

// POST /api/v1/reports/generate-snapshot
router.post("/generate-snapshot", authenticateToken, requireRole("admin"), ctrl.generateSnapshot);

export default router;
