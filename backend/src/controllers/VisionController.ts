import { Request, Response } from "express";
import multer from "multer";
import { BaseController } from "./BaseController.js";
import { VisionService } from "../services/VisionService.js";

// Multer configured to store in memory (buffer), max 4 MB, images only
export const visionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are accepted."));
    }
  },
});

type MulterRequest = Request & { file?: Express.Multer.File };

export class VisionController extends BaseController {
  private readonly visionService = new VisionService();

  /**
   * POST /api/v1/vision/decode
   * Body: multipart/form-data  field "image" (JPEG/PNG/WebP ≤ 4 MB)
   */
  public decode = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        this.sendError(
          res,
          "No image file provided. Send multipart/form-data with field 'image'.",
          400
        );
        return;
      }
      const result = await this.visionService.decodeBarcodeFromBuffer(req.file.buffer);
      this.sendSuccess(res, result);
    } catch (err) {
      const message = (err as Error).message;
      const statusCode =
        message.includes("not configured") ||
        message.includes("disabled") ||
        message.includes("not yet implemented")
          ? 503
          : 400;
      this.sendError(res, message, statusCode);
    }
  };
}
