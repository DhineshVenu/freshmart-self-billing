export interface ProductData {
  _id: string;
  barcode: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
  price: number;
  stockQty: number;
  active: boolean;
  imageUrl?: string;
  // Extended fields (nutrition, wayfinding, clearance)
  aisle?: string;
  shelf?: string;
  bay?: number;
  mapCoordinates?: { x: number; y: number };
  nutriScore?: "A" | "B" | "C" | "D" | "E";
  allergens?: string[];
  dietaryFlags?: string[];
  calories?: number;
  expiryDate?: string | Date | null;
  clearanceDiscountPercent?: number;
}

export interface CartItemData {
  productId: string;
  barcode: string;
  name: string;
  category?: string;
  unit?: string;
  price: number;
  quantity: number;
  availableStock: number;
  lineTotal: number;
}

export interface CartData {
  sessionCode: string;
  items: CartItemData[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
}

export interface GetCartApiResponse {
  success: boolean;
  data: {
    cart: CartData;
  };
  message?: string;
}

export interface GetProductsApiResponse {
  success: boolean;
  data: {
    products: ProductData[];
  };
}
