import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "../models/Product.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { Cart } from "../models/Cart.js";
import { CartService } from "../services/CartService.js";

describe("CartService Integration with In-Memory MongoDB", () => {
  let mongoServer: MongoMemoryServer;
  let cartService: CartService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    cartService = new CartService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    await ShoppingSession.deleteMany({});
    await Cart.deleteMany({});
  });

  it("should create and return an empty cart when no cart exists for a session", async () => {
    const sessionCode = "session-empty-001";
    const cart = await cartService.getCartBySessionCode(sessionCode);

    expect(cart.sessionCode).toBe(sessionCode);
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
    expect(cart.taxAmount).toBe(0);
    expect(cart.totalAmount).toBe(0);
    expect(cart.itemCount).toBe(0);
  });

  it("should add a product to cart and compute 5% GST correctly", async () => {
    const product = await Product.create({
      barcode: "8901234567890",
      name: "Organic Oats 1kg",
      category: "Grains",
      price: 200,
      stockQty: 10,
      active: true,
    });

    const sessionCode = "session-add-001";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    const cart = await cartService.addItemToCart({
      sessionCode,
      barcode: product.barcode,
      quantity: 2,
    });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe("Organic Oats 1kg");
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].lineTotal).toBe(400);
    expect(cart.subtotal).toBe(400);
    expect(cart.taxAmount).toBe(20); // 5% of 400
    expect(cart.totalAmount).toBe(420);
    expect(cart.itemCount).toBe(2);
  });

  it("should prevent adding more items than available in stock", async () => {
    const product = await Product.create({
      barcode: "8909999999999",
      name: "Limited Biscuit Pack",
      category: "Snacks",
      price: 50,
      stockQty: 3,
      active: true,
    });

    const sessionCode = "session-stock-001";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    // Adding 4 when stock is 3 must throw error
    await expect(
      cartService.addItemToCart({
        sessionCode,
        barcode: product.barcode,
        quantity: 4,
      })
    ).rejects.toThrow(/Max available in stock: 3/);
  });

  it("should update item quantity and recalculate subtotal and taxes", async () => {
    const product = await Product.create({
      barcode: "8901111222233",
      name: "Fresh Milk 1L",
      category: "Dairy",
      price: 60,
      stockQty: 10,
      active: true,
    });

    const sessionCode = "session-update-001";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await cartService.addItemToCart({
      sessionCode,
      barcode: product.barcode,
      quantity: 1,
    });

    const updated = await cartService.updateItemQuantity({
      sessionCode,
      productId: product._id.toString(),
      quantity: 3,
    });

    expect(updated.items[0].quantity).toBe(3);
    expect(updated.subtotal).toBe(180); // 60 * 3
    expect(updated.taxAmount).toBe(9); // 5% of 180
    expect(updated.totalAmount).toBe(189);
  });

  it("should delete item from cart when quantity is reduced to 0 or delete is called", async () => {
    const product = await Product.create({
      barcode: "8907777888899",
      name: "Apple 1kg",
      category: "Produce",
      price: 150,
      stockQty: 10,
      active: true,
    });

    const sessionCode = "session-delete-001";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await cartService.addItemToCart({
      sessionCode,
      barcode: product.barcode,
      quantity: 2,
    });

    const afterDelete = await cartService.removeItemFromCart(
      sessionCode,
      product._id.toString()
    );

    expect(afterDelete.items).toHaveLength(0);
    expect(afterDelete.subtotal).toBe(0);
    expect(afterDelete.totalAmount).toBe(0);
  });
});
