const API_BASE = "http://localhost:5000/api/v1";

export interface VisionDecodeResult {
  barcode: string;
  format: string;
  confidence: number;
}

/**
 * Upload a JPEG/PNG image blob to the backend Vision API endpoint.
 * Returns the decoded barcode value.
 * Throws if VISION_API_ENABLED=false or credentials are missing on the backend.
 */
export async function decodeBarcodeFromImage(imageBlob: Blob): Promise<VisionDecodeResult> {
  const formData = new FormData();
  formData.append("image", imageBlob, "scan.jpg");

  const res = await fetch(`${API_BASE}/vision/decode`, {
    method: "POST",
    credentials: "include",
    body: formData,
    // NOTE: Do NOT set Content-Type manually — browser sets multipart/form-data with boundary
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message || json.error?.message || "Vision decode failed");
  }
  return json.data as VisionDecodeResult;
}
