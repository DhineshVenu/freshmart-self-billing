import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product.js";
import { Order, IOrderItemSnapshot } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { DailySalesSnapshot } from "../models/DailySalesSnapshot.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { Cart } from "../models/Cart.js";
import { InventoryAlert } from "../models/InventoryAlert.js";
import { AuditLog } from "../models/AuditLog.js";
import { Store } from "../models/Store.js";
import { User } from "../models/User.js";
import { productService } from "../services/ProductService.js";
import { authService } from "../services/AuthService.js";
import { storeService } from "../services/StoreService.js";
import { reportService } from "../services/ReportService.js";
import { SupermarketDomain } from "../utils/SupermarketDomain.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/supermarket_billing";

async function runSeed() {
  console.log("==================================================================");
  console.log("  Fresh Mart Database Reset & 30-Product / Sales Replicator");
  console.log("==================================================================");
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log("✓ Connected to MongoDB.");

  // 1. Clear old data
  console.log("\n[1/6] Cleaning up old transactional and product data...");
  const deleteResults = await Promise.all([
    Product.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    DailySalesSnapshot.deleteMany({}),
    ShoppingSession.deleteMany({}),
    Cart.deleteMany({}),
    InventoryAlert.deleteMany({}),
  ]);
  console.log(`✓ Deleted old records:
    - Products: ${deleteResults[0].deletedCount}
    - Orders: ${deleteResults[1].deletedCount}
    - Payments: ${deleteResults[2].deletedCount}
    - Daily Snapshots: ${deleteResults[3].deletedCount}
    - Shopping Sessions: ${deleteResults[4].deletedCount}
    - Carts: ${deleteResults[5].deletedCount}
    - Alerts: ${deleteResults[6].deletedCount}`);

  // 2. Ensure base users and store exist
  console.log("\n[2/6] Verifying Store and Default User accounts...");
  await authService.seedDefaultAccounts();
  await storeService.seedDefaultStore();
  const store = await Store.findOne({ active: true });
  const storeId = store ? store._id : null;
  const storeName = store ? store.name : "Fresh Mart Main Branch";
  console.log(`✓ Default Store verified: "${storeName}" (ID: ${storeId})`);

  // 3. Seed the 30 products with extended fields
  console.log("\n[3/6] Seeding 30 supermarket products with rich metadata...");
  await productService.seedDefaultProducts(true);
  const products = await Product.find({ active: true });
  console.log(`✓ Successfully seeded ${products.length} active products across 6 categories.`);

  // 4. Replicate 30 days of paid orders & payments
  console.log("\n[4/6] Replicating 30 days of paid orders, sales, and payments for ReportsPage...");
  const paymentMethods: Array<"UPI" | "CARD" | "CASH"> = ["UPI", "CARD", "CASH"];
  const customerNames = [
    "Aarav Sharma", "Priya Patel", "Rahul Verma", "Ananya Iyer",
    "Vikram Malhotra", "Sneha Reddy", "Rohan Joshi", "Neha Kapoor",
    "Arjun Nair", "Pooja Gupta", "Karan Mehta", "Divya Menon"
  ];

  const now = new Date();
  let totalOrdersCreated = 0;
  let totalRevenueAccumulated = 0;

  // Peak hour weights (supermarkets see major rush around 11:00-12:00 and 17:00-20:00)
  const realisticHours = [9, 10, 11, 11, 12, 14, 15, 17, 18, 18, 19, 19, 20, 20, 21];

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - dayOffset);

    // 3 to 7 orders per day
    const ordersTodayCount = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < ordersTodayCount; i++) {
      const orderHour = realisticHours[Math.floor(Math.random() * realisticHours.length)];
      const orderMinute = Math.floor(Math.random() * 60);
      const paidTimestamp = new Date(targetDate);
      paidTimestamp.setHours(orderHour, orderMinute, 0, 0);

      const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
      const customerEmail = `${customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
      const orderNo = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const sessionCode = `SES-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      // Pick 1 to 5 random products for the basket
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, itemCount);

      let subtotal = 0;
      const orderItems: IOrderItemSnapshot[] = [];

      for (const prod of selectedProducts) {
        const qty = Math.floor(Math.random() * 2) + 1;
        const clearanceApplied = (prod.clearanceDiscountPercent ?? 0) > 0;
        const unitPrice = clearanceApplied
          ? Number((prod.price * (1 - (prod.clearanceDiscountPercent ?? 0) / 100)).toFixed(2))
          : prod.price;
        const lineTotal = Number((unitPrice * qty).toFixed(2));
        subtotal += lineTotal;

        orderItems.push({
          productId: String(prod._id),
          barcode: prod.barcode,
          name: prod.name,
          category: prod.category,
          price: unitPrice,
          unit: prod.unit || "1 unit",
          quantity: qty,
          lineTotal,
          clearanceApplied,
        });
      }

      const { taxAmount, totalAmount } = SupermarketDomain.TaxEngine.calculateTax(subtotal);

      const order = await Order.create({
        orderNo,
        sessionId: sessionCode,
        storeId,
        storeName,
        customerName,
        customerEmail,
        items: orderItems,
        subtotal,
        taxAmount,
        totalAmount,
        status: "PAID",
        paymentMethod,
        paidAt: paidTimestamp,
        createdAt: paidTimestamp,
        updatedAt: paidTimestamp,
      });

      await Payment.create({
        orderId: String(order._id),
        orderNo: order.orderNo,
        amount: totalAmount,
        method: paymentMethod,
        status: "SUCCESS",
        confirmedBy: "Worker POS",
        confirmedAt: paidTimestamp,
        createdAt: paidTimestamp,
        updatedAt: paidTimestamp,
      });

      totalOrdersCreated++;
      totalRevenueAccumulated += totalAmount;
    }

    // Generate the DailySalesSnapshot for this day
    await reportService.generateDailySnapshot(storeId ? String(storeId) : undefined, targetDate);
  }

  console.log(`✓ Replicated ${totalOrdersCreated} paid orders with total sales ₹${totalRevenueAccumulated.toFixed(2)}.`);
  console.log(`✓ Generated daily sales snapshots for all 31 days.`);

  // 5. Seed Inventory Alerts for low stock items
  console.log("\n[5/6] Generating sample inventory alerts for store operations...");
  const lowStockProducts = products.filter(p => p.stockQty <= 20);
  for (const p of lowStockProducts.slice(0, 4)) {
    await InventoryAlert.create({
      productId: p._id,
      storeId,
      productName: p.name,
      barcode: p.barcode,
      category: p.category,
      currentQty: p.stockQty,
      reorderThreshold: 20,
      status: "OPEN",
    });
  }
  console.log(`✓ Generated ${Math.min(4, lowStockProducts.length)} inventory alerts.`);

  // 6. Seed Audit Logs
  console.log("\n[6/6] Writing system audit trail entries...");
  const adminUser = await User.findOne({ role: "admin" });
  await AuditLog.create({
    actorId: adminUser ? String(adminUser._id) : "SYSTEM",
    actorRole: "admin",
    action: "SYSTEM_INITIALIZED",
    targetType: "Database",
    details: `Database seeded with 30 products and ${totalOrdersCreated} replicated sales records`,
  });
  console.log("✓ Audit log initialized.");

  console.log("\n==================================================================");
  console.log("  Seed Completed Successfully!");
  console.log("==================================================================");
  console.log(`- Products: ${products.length} items (Barcodes: 8901 to 8931)`);
  console.log(`- Paid Orders: ${totalOrdersCreated} orders across 30 days`);
  console.log(`- Total Sales: ₹${totalRevenueAccumulated.toFixed(2)}`);
  console.log(`- Reports: Ready to view on /reports`);
  console.log("==================================================================");

  await mongoose.disconnect();
}

runSeed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
