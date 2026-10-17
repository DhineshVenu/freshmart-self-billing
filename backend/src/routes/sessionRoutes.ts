import { Router } from "express";
import { sessionController } from "../controllers/sessionController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/", sessionController.create);
router.get("/", sessionController.getAll);
router.get("/:code", sessionController.getByCode);
router.get("/:code/stream", sessionController.streamSessionEvents);
router.patch("/:code/join", sessionController.join);
router.post("/:code/join", authenticateToken, sessionController.join);

export default router;
