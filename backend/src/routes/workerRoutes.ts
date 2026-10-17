import { Router } from "express";
import { workerController } from "../controllers/WorkerController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// Admin only worker management
router.post("/", authenticateToken, requireRole("admin"), workerController.createWorker);
router.get("/", authenticateToken, requireRole("admin"), workerController.getAllWorkers);
router.patch("/:id/status", authenticateToken, requireRole("admin"), workerController.updateStatus);

export default router;
