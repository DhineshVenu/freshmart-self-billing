import api from "./api";
import { Order, PaymentMethod } from "../types";

export async function processCheckout(
  sessionCode: string,
  paymentMethod: PaymentMethod = "UPI"
): Promise<{ order: Order }> {
  const res = await api.post<{ success: boolean; data: { order: Order } }>(
    "/v1/checkout",
    { sessionCode, paymentMethod }
  );
  return res.data.data;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const res = await api.get<{ success: boolean; data: { order: Order } }>(
    `/v1/orders/${orderId}`
  );
  return res.data.data.order;
}

export async function getMyOrders(): Promise<Order[]> {
  const res = await api.get<{ success: boolean; data: { orders: Order[] } }>(
    "/v1/orders/mine"
  );
  return res.data.data.orders;
}
