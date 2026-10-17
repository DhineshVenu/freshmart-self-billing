import { Router } from "express";
import { authController } from "../controllers/AuthController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticateToken, authController.me);

export default router;
