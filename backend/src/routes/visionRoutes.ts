import { Router } from "express";
import { VisionController, visionUpload } from "../controllers/VisionController.js";

const router = Router();
const ctrl = new VisionController();

// POST /api/v1/vision/decode
// No auth required — kiosk-friendly (same pattern as cart routes)
// Body: multipart/form-data  field "image"  (JPEG/PNG/WebP ≤ 4 MB)
router.post("/decode", visionUpload.single("image"), ctrl.decode);

export default router;
