import mongoose from "mongoose";
import { PushToken } from "../models/PushToken.js";
import { LogExecution, Singleton } from "../utils/index.js";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Singleton
export class PushNotificationService {
  private readonly expoPushUrl: string;

  constructor() {
    this.expoPushUrl =
      process.env.EXPO_PUSH_URL ?? "https://exp.host/--/api/v2/push/send";
  }

  /**
   * Register or refresh an Expo push token for a user.
   */
  @LogExecution
  async registerToken(
    userId: string,
    token: string,
    platform: "ios" | "android"
  ): Promise<void> {
    await PushToken.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), platform },
      { $set: { token, active: true, registeredAt: new Date() } },
      { upsert: true, new: true }
    );
  }

  /**
   * Deactivate all push tokens for a user (called on logout).
   */
  @LogExecution
  async deregisterTokens(userId: string): Promise<void> {
    await PushToken.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { active: false } }
    );
  }

  /**
   * Send a push notification to all active devices of a user.
   * Uses the Expo Push API (https://expo.dev/push-notifications).
   */
  @LogExecution
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await PushToken.find({
      userId: new mongoose.Types.ObjectId(userId),
      active: true,
    })
      .select("token")
      .lean();

    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    try {
      const response = await fetch(this.expoPushUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Expo Push API returned ${response.status} for userId ${userId}`
        );
      }
    } catch (err) {
      console.error(
        `⚠️ Push notification dispatch failed for userId ${userId}:`,
        (err as Error).message
      );
    }
  }
}

export const pushNotificationService = new PushNotificationService();
