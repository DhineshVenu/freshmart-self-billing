import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { SessionService } from "../services/SessionService.js";

describe("SessionService.cancelSession", () => {
  let mongoServer: MongoMemoryServer;
  let service: SessionService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    service = new SessionService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ShoppingSession.deleteMany({});
  });

  it("cancels an ACTIVE session and sets status to CANCELLED", async () => {
    const { session } = await service.createSession({ storeName: "Test Store" });
    const cancelled = await service.cancelSession(session.id, "worker-123");

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.id).toBe(session.id);
  });

  it("throws when cancelling a COMPLETED session", async () => {
    const { session } = await service.createSession({ storeName: "Test Store" });
    await ShoppingSession.updateOne(
      { sessionCode: session.id },
      { status: "COMPLETED" }
    );

    await expect(
      service.cancelSession(session.id, "worker-123")
    ).rejects.toThrow("Cannot cancel a completed shopping session");
  });

  it("throws when cancelling a non-existent session", async () => {
    await expect(
      service.cancelSession("nonexistent-code", "worker-123")
    ).rejects.toThrow("Shopping session not found");
  });

  it("throws when cancelling an already-cancelled session", async () => {
    const { session } = await service.createSession({ storeName: "Test Store" });
    await service.cancelSession(session.id, "worker-123");

    await expect(
      service.cancelSession(session.id, "worker-123")
    ).rejects.toThrow("Shopping session is already cancelled");
  });
});
