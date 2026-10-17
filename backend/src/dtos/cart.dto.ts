export interface AddToCartDTO {
  sessionCode: string;
  barcode: string;
  quantity?: number;
}

export interface UpdateCartItemQtyDTO {
  sessionCode: string;
  productId: string;
  quantity: number;
}

export interface RemoveCartItemDTO {
  sessionCode: string;
  productId: string;
}

export interface CartItemResponse {
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

export interface CartResponseData {
  sessionCode: string;
  items: CartItemResponse[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
}
