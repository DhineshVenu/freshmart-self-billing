import { LogExecution, Singleton } from "../utils/index.js";

export interface VisionDecodeResult {
  barcode: string;
  format: string;
  confidence: number;
}

/**
 * VisionService — integrates Google Cloud Vision API or AWS Rekognition for barcode decoding.
 * Activated only when VISION_API_ENABLED=true in .env.
 * 
 * TODO Phase 2C-2: Install @google-cloud/vision or aws-sdk and implement actual decode.
 * For now, this returns a stub error so routes compile.
 */
@Singleton
export class VisionService {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.VISION_API_ENABLED === "true";
    if (!this.enabled) {
      console.log("📷 VisionService: VISION_API_ENABLED=false (disabled)");
    }
  }

  @LogExecution
  async decodeBarcodeFromBuffer(buffer: Buffer): Promise<VisionDecodeResult> {
    if (!this.enabled) {
      throw new Error(
        "Vision API is disabled. Set VISION_API_ENABLED=true in .env and configure credentials to enable cloud barcode decoding."
      );
    }

    // TODO Phase 2C-2: Implement actual Google Cloud Vision or AWS Rekognition call here
    // Example pseudo-code:
    // const vision = new ImageAnnotatorClient();
    // const [result] = await vision.textDetection({ image: { content: buffer } });
    // Parse barcodes from result.textAnnotations or result.barcodeAnnotations

    throw new Error(
      "Vision API integration not yet implemented. Complete Phase 2C-2 to enable cloud-based barcode decoding."
    );
  }
}

export const visionService = new VisionService();
