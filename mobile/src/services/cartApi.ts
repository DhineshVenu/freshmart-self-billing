import api from "./api";
import { Cart, Product } from "../types";

export async function getCart(sessionCode: string): Promise<Cart> {
  const res = await api.get<{ success: boolean; data: { cart: Cart } }>(
    `/carts/${sessionCode}`
  );
  return res.data.data.cart;
}

export async function getProductDetail(barcode: string): Promise<Product> {
  const res = await api.get<{ success: boolean; data: { product: Product } }>(
    `/products/barcode/${encodeURIComponent(barcode)}/detail`
  );
  return res.data.data.product;
}

export async function addToCart(
  sessionCode: string,
  barcode: string,
  quantity: number = 1
): Promise<Cart> {
  const res = await api.post<{ success: boolean; data: { cart: Cart } }>(
    `/carts/${sessionCode}/items`,
    { barcode, quantity }
  );
  return res.data.data.cart;
}

export async function updateCartItemQty(
  sessionCode: string,
  productId: string,
  quantity: number
): Promise<Cart> {
  const res = await api.patch<{ success: boolean; data: { cart: Cart } }>(
    `/carts/${sessionCode}/items/${productId}`,
    { quantity }
  );
  return res.data.data.cart;
}

export async function removeCartItem(sessionCode: string, productId: string): Promise<Cart> {
  const res = await api.delete<{ success: boolean; data: { cart: Cart } }>(
    `/carts/${sessionCode}/items/${productId}`
  );
  return res.data.data.cart;
}
