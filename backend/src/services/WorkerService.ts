import bcrypt from "bcryptjs";
import { User, IUser, UserStatus } from "../models/User.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";

@Singleton
export class WorkerService {
  @LogExecution
  @ValidateInput
  async createWorker(name: string, email: string, password: string): Promise<IUser> {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new Error("Email address is already in use.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const worker = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "worker",
      status: "active",
    });

    return worker;
  }

  @LogExecution
  async getAllWorkers(): Promise<IUser[]> {
    return User.find({ role: "worker" }).select("-passwordHash").sort({ createdAt: -1 });
  }

  @LogExecution
  @ValidateInput
  async updateWorkerStatus(workerId: string, status: UserStatus): Promise<IUser | null> {
    const worker = await User.findOneAndUpdate(
      { _id: workerId, role: "worker" },
      { status },
      { new: true }
    ).select("-passwordHash");

    if (!worker) {
      throw new Error("Worker account not found.");
    }

    return worker;
  }
}

export const workerService = new WorkerService();
