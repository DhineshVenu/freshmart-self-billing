import { Cart } from "../models/Cart.js";
import { Order, IOrder, PaymentMethod } from "../models/Order.js";
import { Payment, IPayment } from "../models/Payment.js";
import { Product } from "../models/Product.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { SupermarketDomain } from "../utils/SupermarketDomain.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";
import { mailService } from "./MailService.js";
import { sessionSyncService } from "./SessionSyncService.js";
import { inventoryService } from "./InventoryService.js";
import { pushNotificationService } from "./PushNotificationService.js";

@Singleton
export class CheckoutService {
  @LogExecution
  @ValidateInput
  async processCheckout(sessionCode: string, paymentMethod: PaymentMethod = "UPI"): Promise<{ order: IOrder; payment: IPayment }> {
    const session = await ShoppingSession.findOne({ sessionCode });
    if (!session) {
      throw new Error("Shopping session not found.");
    }

    if (session.status === "COMPLETED") {
      throw new Error("This shopping session has already been completed.");
    }

    const cart = await Cart.findOne({ sessionCode });
    if (!cart || cart.items.length === 0) {
      throw new Error("Cannot checkout an empty shopping cart.");
    }

    // Lock session state
    session.status = "CHECKOUT_PENDING";
    await session.save();

    // Revalidate products, prices, and stock
    const itemSnapshots = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.active) {
        throw new Error(`Product '${item.name}' is no longer available.`);
      }

      if (product.stockQty < item.quantity) {
        throw new Error(
          `Insufficient stock for '${product.name}'. Requested ${item.quantity}, but only ${product.stockQty} left.`
        );
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      itemSnapshots.push({
        productId: String(product._id),
        barcode: product.barcode,
        name: product.name,
        category: product.category || "General",
        price: product.price,
        unit: product.unit || "",
        quantity: item.quantity,
        lineTotal,
      });
    }

    const { taxAmount, totalAmount } = SupermarketDomain.TaxEngine.calculateTax(subtotal);

    // Idempotent checkout guard: check if an order already exists for this session
    const existingOrder = await Order.findOne({ sessionId: sessionCode }).sort({ createdAt: -1 });
    if (existingOrder) {
      if (existingOrder.status === "PAID") {
        const payment = await Payment.findOne({ orderId: String(existingOrder._id) });
        return { order: existingOrder, payment: payment! };
      }

      if (existingOrder.status === "PENDING") {
        // Reuse and update the existing pending order instead of generating a duplicate bill
        existingOrder.customerId = session.joinedCustomerId?.toString();
        existingOrder.customerName = session.joinedCustomerName || "Customer";
        existingOrder.customerEmail = session.joinedCustomerEmail || undefined;
        existingOrder.items = itemSnapshots;
        existingOrder.subtotal = subtotal;
        existingOrder.taxAmount = taxAmount;
        existingOrder.totalAmount = totalAmount;
        existingOrder.paymentMethod = paymentMethod;
        await existingOrder.save();

        let payment = await Payment.findOne({ orderId: String(existingOrder._id) });
        if (payment) {
          payment.amount = totalAmount;
          payment.method = paymentMethod;
          await payment.save();
        } else {
          payment = await Payment.create({
            orderId: String(existingOrder._id),
            orderNo: existingOrder.orderNo,
            amount: totalAmount,
            method: paymentMethod,
            status: "PENDING",
            idempotencyKey: `IDEM-${existingOrder.orderNo}-${Date.now()}`,
          });
        }

        sessionSyncService.broadcast(sessionCode, "CHECKOUT_PENDING", { order: existingOrder, payment });
        return { order: existingOrder, payment };
      }
    }

    // Generate Order Number via SessionEngine
    const orderNo = SupermarketDomain.SessionEngine.generateOrderNumber();

    // Create Order Snapshot
    const order = await Order.create({
      orderNo,
      sessionId: sessionCode,
      customerId: session.joinedCustomerId?.toString(),
      customerName: session.joinedCustomerName || "Customer",
      customerEmail: session.joinedCustomerEmail || undefined,
      storeName: session.storeName || "Fresh Mart",
      items: itemSnapshots,
      subtotal,
      taxAmount,
      totalAmount,
      status: "PENDING",
      paymentMethod,
    });

    // Create Payment Record
    const payment = await Payment.create({
      orderId: String(order._id),
      orderNo: order.orderNo,
      amount: totalAmount,
      method: paymentMethod,
      status: "PENDING",
      idempotencyKey: `IDEM-${orderNo}-${Date.now()}`,
    });

    sessionSyncService.broadcast(sessionCode, "CHECKOUT_PENDING", { order, payment });

    return { order, payment };
  }

  @LogExecution
  @ValidateInput
  async confirmPayment(orderId: string, confirmedBy: string = "Worker POS"): Promise<{ order: IOrder; payment: IPayment }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order bill not found.");
    }

    if (order.status === "PAID") {
      const existingPayment = await Payment.findOne({ orderId: String(order._id) });
      return { order, payment: existingPayment! };
    }

    // Concurrently safe atomic stock decrement with non-negative guard
    for (const item of order.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, stockQty: { $gte: item.quantity } },
        { $inc: { stockQty: -item.quantity } },
        { returnDocument: "after" }
      );
      if (!updatedProduct) {
        throw new Error(
          `Stock depletion error: Insufficient stock to fulfill order for '${item.name}'. Please update cart.`
        );
      }

      // Fire low-stock alert if qty dropped to/below reorder level (async, non-blocking)
      const session = await ShoppingSession.findOne({ sessionCode: order.sessionId })
        .select("storeId")
        .lean();
      const storeId = session?.storeId ? String(session.storeId) : null;
      inventoryService
        .checkAndAlert(item.productId, storeId, updatedProduct.stockQty)
        .catch((err) => console.error("⚠️ InventoryService.checkAndAlert error:", err));
    }

    order.status = "PAID";
    order.paidAt = new Date();
    await order.save();

    // Cancel any other dangling pending orders for this same session so duplicate bills are never shown
    await Order.updateMany(
      { sessionId: order.sessionId, _id: { $ne: order._id }, status: "PENDING" },
      { status: "CANCELLED" }
    );

    let payment = await Payment.findOne({ orderId: String(order._id) });
    if (!payment) {
      payment = new Payment({
        orderId: String(order._id),
        orderNo: order.orderNo,
        amount: order.totalAmount,
        method: order.paymentMethod || "UPI",
      });
    }

    payment.status = "SUCCESS";
    payment.confirmedBy = confirmedBy;
    payment.confirmedAt = new Date();
    await payment.save();

    // Mark Session as COMPLETED
    await ShoppingSession.findOneAndUpdate(
      { sessionCode: order.sessionId },
      { status: "COMPLETED" }
    );

    // Auto-dispatch digital invoice receipt via Nodemailer if email exists
    if (order.customerEmail && !order.receiptEmailSent) {
      mailService
        .sendInvoiceEmail(order)
        .then((res) => {
          if (res.success) {
            Order.findByIdAndUpdate(order._id, { receiptEmailSent: true }).catch(() => {});
          }
        })
        .catch((err) => {
          console.error("⚠️ Background receipt email dispatch error:", err);
        });
    }

    // Audit Log
    await AuditLog.create({
      actorId: confirmedBy,
      actorRole: "worker",
      action: "CONFIRM_PAYMENT",
      targetType: "Order",
      targetId: String(order._id),
      details: `Payment confirmed for ${order.orderNo}: ₹${order.totalAmount}`,
    });

    sessionSyncService.broadcast(order.sessionId, "PAYMENT_CONFIRMED", { order, payment });

    // Push notification to customer's mobile app (async, non-blocking)
    if (order.customerId) {
      pushNotificationService
        .sendToUser(order.customerId, {
          title: "Payment Confirmed ✅",
          body: `Your order ${order.orderNo} has been paid. Total: ₹${order.totalAmount.toFixed(2)}`,
          data: { orderId: String(order._id), orderNo: order.orderNo },
        })
        .catch((err) => console.error("⚠️ Push notification error:", err));
    }

    return { order, payment };
  }

  @LogExecution
  @ValidateInput
  async sendReceiptEmail(
    orderId: string,
    email?: string
  ): Promise<{ success: boolean; previewUrl?: string | false; message: string; recipient: string }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order bill not found.");
    }

    const targetEmail = email || order.customerEmail;
    if (!targetEmail || !targetEmail.trim()) {
      throw new Error("Please specify a valid email address to receive the receipt.");
    }

    const result = await mailService.sendInvoiceEmail(order, targetEmail.trim());
    if (!result.success) {
      throw new Error(result.error || "Failed to dispatch digital invoice email.");
    }

    order.receiptEmailSent = true;
    order.customerEmail = targetEmail.trim();
    await order.save();

    return {
      success: true,
      previewUrl: result.previewUrl,
      message: `Digital invoice successfully sent to ${targetEmail.trim()}`,
      recipient: targetEmail.trim(),
    };
  }

  @LogExecution
  @ValidateInput
  async getOrderById(orderId: string): Promise<IOrder | null> {
    return Order.findById(orderId);
  }

  @LogExecution
  @ValidateInput
  async getOrdersBySession(sessionCode: string): Promise<IOrder[]> {
    return Order.find({ sessionId: sessionCode, status: { $ne: "CANCELLED" } }).sort({ createdAt: -1 });
  }

  @LogExecution
  async getAllOrders(): Promise<IOrder[]> {
    // Automatically clean up any dangling PENDING orders for sessions that already have a PAID order
    const paidOrders = await Order.find({ status: "PAID" }, "sessionId");
    const paidSessionIds = paidOrders.map((o) => o.sessionId).filter(Boolean);

    if (paidSessionIds.length > 0) {
      await Order.updateMany(
        { sessionId: { $in: paidSessionIds }, status: "PENDING" },
        { status: "CANCELLED" }
      );
    }

    return Order.find({ status: { $ne: "CANCELLED" } }).sort({ createdAt: -1 });
  }

  /** Mobile: get all PAID orders for a specific customer (by their userId). */
  @LogExecution
  @ValidateInput
  async getOrdersByCustomer(customerId: string): Promise<IOrder[]> {
    const customer = await User.findById(customerId).select("email").lean();
    const customerFilter = customer?.email
      ? { $or: [{ customerId }, { customerEmail: customer.email }] }
      : { customerId };

    return Order.find({ ...customerFilter, status: "PAID" })
      .sort({ createdAt: -1 })
      .limit(50);
  }
}

export const checkoutService = new CheckoutService();
