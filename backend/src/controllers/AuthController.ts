import { Response } from "express";
import { BaseController } from "./BaseController.js";
import { authService } from "../services/AuthService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class AuthController extends BaseController {
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        this.sendError(res, "Name, email, and password are required.", 400);
        return;
      }

      const result = await authService.registerCustomer(name, email, password);
      
      // Set HttpOnly cookie
      res.cookie("token", result.token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });

      this.sendSuccess(res, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      this.sendError(res, msg, 400);
    }
  };

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        this.sendError(res, "Email and password are required.", 400);
        return;
      }

      const result = await authService.login(email, password);

      // Set HttpOnly cookie
      res.cookie("token", result.token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });

      this.sendSuccess(res, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      this.sendError(res, msg, 401);
    }
  };

  forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) { this.sendError(res, "Email is required.", 400); return; }
      const result = await authService.forgotPassword(email);
      // In demo mode we return the OTP in the response so it can be shown on screen.
      // In production, remove 'otp' from the response.
      this.sendSuccess(res, { message: "If that email exists, a reset code has been sent.", otp: result.otp });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process request.";
      this.sendError(res, msg, 400);
    }
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        this.sendError(res, "Email, OTP and new password are required.", 400); return;
      }
      await authService.resetPassword(email, otp, newPassword);
      this.sendSuccess(res, { message: "Password reset successfully. You can now log in." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed.";
      this.sendError(res, msg, 400);
    }
  };

  logout = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.clearCookie("token");
    this.sendSuccess(res, { message: "Logged out successfully." });
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      this.sendError(res, "Not authenticated", 401);
      return;
    }
    this.sendSuccess(res, { user: req.user });
  };
}

export const authController = new AuthController();
