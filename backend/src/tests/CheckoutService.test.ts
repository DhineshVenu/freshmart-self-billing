import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "../models/Product.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { Cart } from "../models/Cart.js";
import { CheckoutService } from "../services/CheckoutService.js";

describe("CheckoutService Integration with In-Memory MongoDB", () => {
  let mongoServer: MongoMemoryServer;
  let checkoutService: CheckoutService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    checkoutService = new CheckoutService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should process checkout and atomically decrement stock with concurrency protection", async () => {
    // 1. Seed a product with stock = 5
    const product = await Product.create({
      barcode: "8901234567890",
      name: "Organic Oats 1kg",
      category: "Grains",
      price: 200,
      stockQty: 5,
      active: true,
    });

    const sessionCode = "test-session-101";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart Test Store",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await Cart.create({
      sessionCode,
      items: [
        {
          productId: product._id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          quantity: 2,
          lineTotal: 400,
        },
      ],
    });

    // 2. Process checkout
    const { order } = await checkoutService.processCheckout(sessionCode, "UPI");
    expect(order.status).toBe("PENDING");
    expect(order.subtotal).toBe(400); // 200 * 2
    expect(order.taxAmount).toBe(20); // 5% of 400
    expect(order.totalAmount).toBe(420);

    // 3. Confirm payment -> stock decrements from 5 to 3
    const confirmation = await checkoutService.confirmPayment(String(order._id), "Worker POS");
    expect(confirmation.order.status).toBe("PAID");
    expect(confirmation.payment.status).toBe("SUCCESS");

    const refreshedProduct = await Product.findById(product._id);
    expect(refreshedProduct?.stockQty).toBe(3);
  });

  it("should return the same payment record idempotently if confirmPayment is called twice", async () => {
    const product = await Product.create({
      barcode: "8909999999999",
      name: "Fresh Honey 500g",
      category: "Organic",
      price: 350,
      stockQty: 10,
      active: true,
    });

    const sessionCode = "test-session-idem";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart Idem Store",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await Cart.create({
      sessionCode,
      items: [
        {
          productId: product._id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          quantity: 1,
          lineTotal: 350,
        },
      ],
    });

    const { order } = await checkoutService.processCheckout(sessionCode, "CASH");
    const firstConfirm = await checkoutService.confirmPayment(String(order._id), "Worker POS");
    const secondConfirm = await checkoutService.confirmPayment(String(order._id), "Worker POS");

    expect(firstConfirm.payment._id.toString()).toBe(secondConfirm.payment._id.toString());

    // Verify stock decremented ONLY ONCE (from 10 to 9)
    const refreshedProduct = await Product.findById(product._id);
    expect(refreshedProduct?.stockQty).toBe(9);
  });
});
