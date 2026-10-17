import { Router } from "express";
import { productController } from "../controllers/ProductController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// Public / Session customer routes
router.get("/", productController.getAll);
router.get("/barcode/:barcode", productController.getByBarcode);

// Admin product CRUD routes
router.get("/admin/all", authenticateToken, requireRole("admin"), productController.getAllAdmin);
router.post("/", authenticateToken, requireRole("admin"), productController.create);
router.patch("/:id", authenticateToken, requireRole("admin"), productController.update);
router.delete("/:id", authenticateToken, requireRole("admin"), productController.delete);

export default router;
