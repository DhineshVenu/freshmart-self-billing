import { API_BASE_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import { VisionDecodeResult } from "../types";

/**
 * Upload a captured image to the backend Vision API.
 * Returns the decoded barcode value.
 * Called automatically when the native barcode scanner fails.
 */
export async function decodeBarcodeFromUri(imageUri: string): Promise<VisionDecodeResult> {
  const token = await SecureStore.getItemAsync("auth_token");

  const formData = new FormData();
  // React Native FormData accepts { uri, type, name } objects
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "scan.jpg",
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/v1/vision/decode`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Note: Do NOT set Content-Type — FormData sets multipart/form-data with boundary
    },
    body: formData,
  });

  const json = await response.json() as { success: boolean; data: VisionDecodeResult; message?: string };
  if (!json.success) {
    throw new Error(json.message || "Vision decode failed");
  }
  return json.data;
}
