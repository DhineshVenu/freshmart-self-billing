import { Request, Response, NextFunction } from "express";
import { BaseController } from "./BaseController.js";
import { SessionService } from "../services/SessionService.js";
import { sessionSyncService } from "../services/SessionSyncService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

/**
 * SessionController class extending BaseController.
 *  OOP Inheritance and Composition with SessionService.
 */
export class SessionController extends BaseController {
  private readonly sessionService: SessionService;

  constructor() {
    super();
    this.sessionService = new SessionService();
  }

  /**
   * POST /api/sessions
   * Creates a new shopping session.
   */
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { storeName } = req.body;
      const result = await this.sessionService.createSession({ storeName });
      this.sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/sessions/:code
   * Retrieves shopping session details.
   */
  public getByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const code = Array.isArray(req.params.code)
        ? req.params.code[0]
        : req.params.code;

      const session = await this.sessionService.getSessionByCode(code);
      this.sendSuccess(res, { session }, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/sessions/:code/join
   * Joins a shopping session as a customer.
   */
  public join = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const code = Array.isArray(req.params.code)
        ? req.params.code[0]
        : req.params.code;
      const { customerName, customerEmail } = req.body;

      const session = await this.sessionService.joinSession(code, {
        customerName,
        customerEmail,
        customerId: req.user?.role === "customer" ? req.user.userId : undefined,
      });

      this.sendSuccess(
        res,
        { session },
        200,
        "Session joined successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/sessions
   * Lists all sessions for worker dashboard.
   */
  public getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sessions = await this.sessionService.getAllSessions();
      this.sendSuccess(res, { sessions }, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/sessions/:code/stream
   * Real-time Server-Sent Events (SSE) stream for shopping session updates.
   */
  public streamSessionEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const code = Array.isArray(req.params.code)
        ? req.params.code[0]
        : req.params.code;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      sessionSyncService.subscribe(code, res);
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton instance of SessionController
export const sessionController = new SessionController();
