import { Response } from "express";
import { BaseController } from "./BaseController.js";
import { workerService } from "../services/WorkerService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { AuditLog } from "../models/AuditLog.js";

export class WorkerController extends BaseController {
  createWorker = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        this.sendError(res, "Name, email, and initial password are required.", 400);
        return;
      }

      const worker = await workerService.createWorker(name, email, password);

      // Audit Log
      await AuditLog.create({
        actorId: req.user?.userId || "admin",
        actorRole: req.user?.role || "admin",
        action: "CREATE_WORKER",
        targetType: "Worker",
        targetId: String(worker._id),
        details: `Created worker account: ${worker.email}`,
      });

      this.sendSuccess(res, { worker }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create worker account.";
      this.sendError(res, msg, 400);
    }
  };

  getAllWorkers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workers = await workerService.getAllWorkers();
      this.sendSuccess(res, { workers });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch workers list.";
      this.sendError(res, msg, 500);
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workerId = Array.isArray(id) ? id[0] : id;
      const { status } = req.body;

      if (!status || !["active", "disabled"].includes(status)) {
        this.sendError(res, "Status must be 'active' or 'disabled'.", 400);
        return;
      }

      const worker = await workerService.updateWorkerStatus(workerId, status);

      // Audit Log
      await AuditLog.create({
        actorId: req.user?.userId || "admin",
        actorRole: req.user?.role || "admin",
        action: "UPDATE_WORKER_STATUS",
        targetType: "Worker",
        targetId: workerId,
        details: `Updated worker status to: ${status}`,
      });

      this.sendSuccess(res, { worker });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update worker status.";
      this.sendError(res, msg, 400);
    }
  };
}

export const workerController = new WorkerController();
