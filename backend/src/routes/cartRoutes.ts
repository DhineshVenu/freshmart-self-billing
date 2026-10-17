import { Router } from "express";
import { cartController } from "../controllers/CartController.js";

const router = Router();

// Web client endpoints (/api/carts/current...)
router.get("/current", cartController.getCart);
router.post("/current/items", cartController.addItem);
router.patch("/current/items/:productId", cartController.updateItemQty);
router.delete("/current/items/:productId", cartController.deleteItem);

// Mobile client endpoints (/api/carts/:sessionCode...)
router.get("/:sessionCode", cartController.getCart);
router.post("/:sessionCode/items", cartController.addItem);
router.patch("/:sessionCode/items/:productId", cartController.updateItemQty);
router.delete("/:sessionCode/items/:productId", cartController.deleteItem);

export default router;
