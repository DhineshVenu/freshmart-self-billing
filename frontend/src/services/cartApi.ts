import type {
  CartData,
  GetCartApiResponse,
  GetProductsApiResponse,
  ProductData,
} from "../types/cart";

const API_URL = "http://localhost:5000/api";

export const getProducts = async (category?: string): Promise<ProductData[]> => {
  const url = category && category !== "All"
    ? `${API_URL}/products?category=${encodeURIComponent(category)}`
    : `${API_URL}/products`;

  const response = await fetch(url);
  const result: GetProductsApiResponse = await response.json();
  if (!response.ok) {
    throw new Error("Unable to fetch products catalog");
  }
  return result.data.products;
};

export const getCart = async (sessionCode: string): Promise<CartData> => {
  const response = await fetch(
    `${API_URL}/carts/current?sessionCode=${encodeURIComponent(sessionCode)}`
  );
  const result: GetCartApiResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Unable to fetch cart");
  }
  return result.data.cart;
};

export const addToCart = async (
  sessionCode: string,
  barcode: string,
  quantity: number = 1
): Promise<CartData> => {
  const response = await fetch(`${API_URL}/carts/current/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionCode,
      barcode,
      quantity,
    }),
  });

  const result: GetCartApiResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Unable to add product to cart");
  }
  return result.data.cart;
};

export const updateCartItemQty = async (
  sessionCode: string,
  productId: string,
  quantity: number
): Promise<CartData> => {
  const response = await fetch(
    `${API_URL}/carts/current/items/${productId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionCode,
        quantity,
      }),
    }
  );

  const result: GetCartApiResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Unable to update cart quantity");
  }
  return result.data.cart;
};

export const deleteCartItem = async (
  sessionCode: string,
  productId: string
): Promise<CartData> => {
  const response = await fetch(
    `${API_URL}/carts/current/items/${productId}?sessionCode=${encodeURIComponent(
      sessionCode
    )}`,
    {
      method: "DELETE",
    }
  );

  const result: GetCartApiResponse = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Unable to remove item from cart");
  }
  return result.data.cart;
};
