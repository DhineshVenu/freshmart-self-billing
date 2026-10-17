import { Router } from "express";
import { PushController } from "../controllers/PushController.js";
import { authenticateToken } from "../middleware/index.js";

const router = Router();
const ctrl = new PushController();

// POST /api/v1/push/register
router.post("/register", authenticateToken, ctrl.register);

// DELETE /api/v1/push/deregister
router.delete("/deregister", authenticateToken, ctrl.deregister);

export default router;
