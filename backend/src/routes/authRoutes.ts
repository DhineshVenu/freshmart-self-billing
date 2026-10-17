import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/AuthController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many reset-code requests. Please try again in 15 minutes." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password reset attempts. Please try again in 15 minutes." },
});

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", passwordResetRequestLimiter, authController.forgotPassword);
router.post("/reset-password", passwordResetLimiter, authController.resetPassword);
router.get("/me", authenticateToken, authController.me);

export default router;
