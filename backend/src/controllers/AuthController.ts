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
