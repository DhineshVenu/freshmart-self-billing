import mongoose from "mongoose";
import ShoppingSession, {
  IShoppingSession,
} from "../models/ShoppingSession.js";
import { User } from "../models/User.js";
import {
  CreateSessionDTO,
  JoinSessionDTO,
  SessionResponseData,
} from "../dtos/session.dto.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";

/**
 * Service class encapsulating all business logic and database access for Shopping Sessions.
 * Demonstrates OOP Encapsulation and Data Transformation.
 */
@Singleton
export class SessionService {
  /**
   * Private helper method to format Mongoose document to clean DTO.
   */
  private formatSessionResponse(
    session: IShoppingSession
  ): SessionResponseData {
    return {
      id: session.sessionCode,
      databaseId: session._id.toString(),
      storeName: session.storeName,
      workerId: session.workerId.toString(),
      storeId: session.storeId ? session.storeId.toString() : null,
      status: session.status,
      joinedCustomerName: session.joinedCustomerName || null,
      joinedCustomerEmail: session.joinedCustomerEmail || null,
      joinedAt: session.joinedAt || null,
      createdAt: session.createdAt,
    };
  }

  /**
   * Resolves the ObjectId for the system demo worker account.
   * Falls back gracefully if no worker account exists yet (e.g. during seeding).
   */
  private async resolveDefaultWorkerId(): Promise<mongoose.Types.ObjectId> {
    const worker = await User.findOne({ role: "worker" }).select("_id").lean();
    if (worker) return worker._id as mongoose.Types.ObjectId;
    // During initial seed the worker doesn't exist yet — use a deterministic placeholder ObjectId
    return new mongoose.Types.ObjectId("000000000000000000000001");
  }

  /**
   * Create a new shopping session in MongoDB.
   */
  @LogExecution
  public async createSession(
    dto: CreateSessionDTO,
    workerObjectId?: mongoose.Types.ObjectId
  ): Promise<{ session: SessionResponseData; joinUrl: string }> {
    if (!dto.storeName || !dto.storeName.trim()) {
      throw new Error("Store name is required");
    }

    const workerId = workerObjectId ?? (await this.resolveDefaultWorkerId());

    const session = await ShoppingSession.create({
      storeName: dto.storeName.trim(),
      workerId,
      storeId: dto.storeId ?? null,
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const joinUrl = `${clientUrl}/join/${session.sessionCode}`;

    return {
      session: this.formatSessionResponse(session),
      joinUrl,
    };
  }

  /**
   * Find a shopping session by its unique session code.
   */
  @LogExecution
  @ValidateInput
  public async getSessionByCode(
    code: string
  ): Promise<SessionResponseData> {
    const session = await ShoppingSession.findOne({ sessionCode: code });

    if (!session) {
      throw new Error("Shopping session not found");
    }

    return this.formatSessionResponse(session);
  }

  /**
   * Register a customer joining an active shopping session.
   */
  @LogExecution
  @ValidateInput
  public async joinSession(
    code: string,
    dto: JoinSessionDTO
  ): Promise<SessionResponseData> {
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new Error("Customer name is required to join session");
    }

    const session = await ShoppingSession.findOne({ sessionCode: code });

    if (!session) {
      throw new Error("Shopping session not found");
    }

    if (session.status !== "ACTIVE") {
      throw new Error(`Cannot join session with status ${session.status}`);
    }

    if (!mongoose.isValidObjectId(session.workerId)) {
      session.workerId = await this.resolveDefaultWorkerId();
    }

    session.joinedCustomerName = dto.customerName.trim();
    if (dto.customerId) {
      session.joinedCustomerId = new mongoose.Types.ObjectId(dto.customerId);
    }
    if (dto.customerEmail && dto.customerEmail.trim()) {
      session.joinedCustomerEmail = dto.customerEmail.trim().toLowerCase();
    }
    session.joinedAt = new Date();

    await session.save();

    return this.formatSessionResponse(session);
  }

  /**
   * Get all active and recent sessions for worker view.
   */
  @LogExecution
  public async getAllSessions(): Promise<SessionResponseData[]> {
    const sessions = await ShoppingSession.find().sort({ createdAt: -1 }).limit(50);
    return sessions.map((s) => this.formatSessionResponse(s));
  }
}
