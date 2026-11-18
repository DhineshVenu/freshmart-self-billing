import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import { CheckoutService } from "../services/CheckoutService.js";
import { AuthService } from "../services/AuthService.js";

/**
 * Loyalty / bounty points integration tests.
 * Verifies: awarding on PAID confirmation, idempotency, and redemption validation.
 * Follows the in-memory MongoDB pattern from CheckoutService.test.ts.
 */
describe("Loyalty bounty points", () => {
  let mongoServer: MongoMemoryServer;
  let checkoutService: CheckoutService;
  let authService: AuthService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    checkoutService = new CheckoutService();
    authService = new AuthService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("awards bounty points and wallet credit when a customer's order is confirmed PAID (₹500 → 50 points, ₹25 wallet)", async () => {
    // 1. Create a customer
    const customer = await User.create({
      name: "Loyalty Customer",
      email: "loyal@example.com",
      passwordHash: "x",
      role: "customer",
      status: "active",
    });

    // 2. Seed a product + session + a ₹500 order owned by the customer
    const product = await Product.create({
      barcode: "8901234567890",
      name: "Premium Basmati 5kg",
      category: "Grains",
      price: 500,
      stockQty: 10,
      active: true,
    });

    const sessionCode = "bounty-session-1";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
      joinedCustomerId: customer._id,
      joinedCustomerName: "Loyalty Customer",
    });

    const order = await Order.create({
      orderNo: "ORD-500001",
      sessionId: sessionCode,
      customerId: String(customer._id),
      customerName: "Loyalty Customer",
      storeName: "Fresh Mart",
      items: [
        {
          productId: String(product._id),
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          price: 500,
          unit: "pack",
          quantity: 1,
          lineTotal: 500,
        },
      ],
      subtotal: 500,
      taxAmount: 0,
      totalAmount: 500,
      status: "PENDING",
      paymentMethod: "UPI",
    });

    // 3. Confirm payment
    const { order: paidOrder, payment } = await checkoutService.confirmPayment(
      String(order._id),
      "Worker POS"
    );
    expect(paidOrder.status).toBe("PAID");
    expect(payment.status).toBe("SUCCESS");

    // 4. Bounty: floor(500/10) = 50 points, 50 * 0.5 = 25 wallet credit
    const refreshed = await User.findById(customer._id);
    expect(refreshed?.bountyPoints).toBe(50);
    expect(refreshed?.bountyWalletBalance).toBe(25);

    // 5. BOUNTY_EARNED audit log written
    const bountyLog = await AuditLog.findOne({
      action: "BOUNTY_EARNED",
      targetId: String(order._id),
    });
    expect(bountyLog).toBeTruthy();
    expect(bountyLog?.actorRole).toBe("customer");
  });

  it("does NOT re-award bounty when confirmPayment is called a second time (idempotent)", async () => {
    const customer = await User.create({
      name: "Idem Customer",
      email: "idem@example.com",
      passwordHash: "x",
      role: "customer",
      status: "active",
    });
    const product = await Product.create({
      barcode: "8901111222233",
      name: "Test Item",
      category: "General",
      price: 500,
      stockQty: 10,
      active: true,
    });
    const sessionCode = "bounty-session-idem";
    await ShoppingSession.create({
      sessionCode,
      storeName: "Fresh Mart",
      workerId: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
      joinedCustomerId: customer._id,
      joinedCustomerName: "Idem Customer",
    });
    const order = await Order.create({
      orderNo: "ORD-500002",
      sessionId: sessionCode,
      customerId: String(customer._id),
      customerName: "Idem Customer",
      storeName: "Fresh Mart",
      items: [
        {
          productId: String(product._id),
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          price: 500,
          unit: "pack",
          quantity: 1,
          lineTotal: 500,
        },
      ],
      subtotal: 500,
      taxAmount: 0,
      totalAmount: 500,
      status: "PENDING",
      paymentMethod: "UPI",
    });

    await checkoutService.confirmPayment(String(order._id), "Worker POS");
    const afterFirst = await User.findById(customer._id);
    expect(afterFirst?.bountyPoints).toBe(50);

    // Second confirmation returns early (order already PAID) — bounty unchanged
    await checkoutService.confirmPayment(String(order._id), "Worker POS");
    const afterSecond = await User.findById(customer._id);
    expect(afterSecond?.bountyPoints).toBe(50);
    expect(afterSecond?.bountyWalletBalance).toBe(25);

    // Stock decremented only once (10 → 9)
    const refreshedProduct = await Product.findById(product._id);
    expect(refreshedProduct?.stockQty).toBe(9);
  });

  it("throws when redeeming more points than available and leaves the balance unchanged", async () => {
    const customer = await User.create({
      name: "Redeem Customer",
      email: "redeem@example.com",
      passwordHash: "x",
      role: "customer",
      status: "active",
      bountyPoints: 30,
      bountyWalletBalance: 15,
    });

    await expect(authService.redeemBounty(String(customer._id), 50)).rejects.toThrow(
      /Insufficient Fresh Points/
    );

    const refreshed = await User.findById(customer._id);
    expect(refreshed?.bountyPoints).toBe(30);
    expect(refreshed?.bountyWalletBalance).toBe(15);
  });

  it("redeems a valid amount, decrements points + wallet, and writes a BOUNTY_REDEEMED audit log", async () => {
    const customer = await User.create({
      name: "Redeem Ok",
      email: "redeemok@example.com",
      passwordHash: "x",
      role: "customer",
      status: "active",
      bountyPoints: 50,
      bountyWalletBalance: 25,
    });

    const result = await authService.redeemBounty(String(customer._id), 10);
    expect(result.redeemed).toBe(10);
    expect(result.walletDebit).toBe(5);
    expect(result.bountyPoints).toBe(40);
    expect(result.bountyWalletBalance).toBe(20);

    const log = await AuditLog.findOne({
      action: "BOUNTY_REDEEMED",
      targetId: String(customer._id),
    });
    expect(log).toBeTruthy();
  });
});
