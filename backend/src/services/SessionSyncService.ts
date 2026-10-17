import { Response } from "express";
import { Singleton } from "../utils/decorators.js";

export type SessionSyncEventType =
  | "CART_UPDATED"
  | "CHECKOUT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "SESSION_CANCELLED"
  | "HEARTBEAT";

@Singleton
export class SessionSyncService {
  private clientStreams: Map<string, Set<Response>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Subscribes an Express Response HTTP stream to a session's real-time events.
   */
  public subscribe(sessionCode: string, res: Response): void {
    if (!this.clientStreams.has(sessionCode)) {
      this.clientStreams.set(sessionCode, new Set());
    }

    const streams = this.clientStreams.get(sessionCode)!;
    streams.add(res);

    // Initial connection acknowledgment
    this.sendEvent(res, "HEARTBEAT", {
      status: "connected",
      sessionCode,
      timestamp: new Date().toISOString(),
    });

    // Clean up when client disconnects
    res.on("close", () => {
      this.unsubscribe(sessionCode, res);
    });
  }

  /**
   * Unsubscribes a client stream when the connection closes.
   */
  public unsubscribe(sessionCode: string, res: Response): void {
    const streams = this.clientStreams.get(sessionCode);
    if (streams) {
      streams.delete(res);
      if (streams.size === 0) {
        this.clientStreams.delete(sessionCode);
      }
    }
  }

  /**
   * Broadcasts an event to all connected clients for a given sessionCode.
   */
  public broadcast(
    sessionCode: string,
    event: SessionSyncEventType,
    payload: unknown
  ): void {
    const streams = this.clientStreams.get(sessionCode);
    if (!streams || streams.size === 0) return;

    for (const res of streams) {
      this.sendEvent(res, event, payload);
    }
  }

  private sendEvent(res: Response, event: SessionSyncEventType, payload: unknown): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // Stream write error — client likely disconnected
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [sessionCode, streams] of this.clientStreams.entries()) {
        for (const res of streams) {
          this.sendEvent(res, "HEARTBEAT", { ping: Date.now(), sessionCode });
        }
      }
    }, 25000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }
}

export const sessionSyncService = new SessionSyncService();
