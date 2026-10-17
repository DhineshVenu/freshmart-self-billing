const API_BASE_URL = "http://localhost:5000/api/v1";

export interface OrderItemSnapshot {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  lineTotal: number;
}

export interface OrderData {
  _id: string;
  orderNo: string;
  sessionId: string;
  customerName: string;
  customerEmail?: string;
  storeName: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod?: "UPI" | "CASH" | "CARD";
  paidAt?: string;
  receiptEmailSent?: boolean;
  createdAt: string;
}

export interface PaymentData {
  _id: string;
  orderId: string;
  orderNo: string;
  amount: number;
  method: "UPI" | "CASH" | "CARD";
  status: "SUCCESS" | "PENDING" | "FAILED";
  confirmedBy?: string;
  confirmedAt?: string;
}

export async function processCheckout(
  sessionCode: string,
  paymentMethod: "UPI" | "CASH" | "CARD" = "UPI"
): Promise<{ order: OrderData; payment: PaymentData }> {
  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionCode, paymentMethod }),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Checkout failed");
  }

  return body.data;
}

export async function confirmPayment(
  orderId: string
): Promise<{ order: OrderData; payment: PaymentData }> {
  const response = await fetch(`${API_BASE_URL}/payments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Payment confirmation failed");
  }

  return body.data;
}

export async function getOrderBill(orderId: string): Promise<OrderData> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to fetch order bill");
  }
  return body.data.order;
}

export async function sendReceiptEmail(
  orderId: string,
  email?: string
): Promise<{ success: boolean; previewUrl?: string | false; message: string; recipient: string }> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/send-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to send receipt email");
  }

  return body.data;
}

export async function getSessionOrders(sessionCode: string): Promise<OrderData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/session/${sessionCode}`);
    const body = await response.json();
    if (!response.ok || !body.success) {
      return [];
    }
    return body.data.orders || [];
  } catch {
    return [];
  }
}
