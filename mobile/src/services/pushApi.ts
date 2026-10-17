import api from "./api";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

export async function registerPushToken(): Promise<void> {
  if (isRunningInExpoGo()) {
    console.warn("Push notifications require a development build and are unavailable in Expo Go.");
    return;
  }

  try {
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();

    await api.post("/v1/push/register", {
      token: tokenData.data,
      platform: Platform.OS as "ios" | "android",
    });

    console.log("✅ Push token registered:", tokenData.data.slice(0, 20) + "...");
  } catch (err) {
    console.warn("⚠️ Push token registration failed:", (err as Error).message);
  }
}

export async function deregisterPushToken(): Promise<void> {
  try {
    await api.delete("/v1/push/deregister");
  } catch {
    // Non-fatal — cleanup best effort
  }
}
