// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "customer" | "worker" | "admin" | "store_manager";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionStatus = "ACTIVE" | "CHECKOUT_PENDING" | "COMPLETED" | "CANCELLED";

export interface ShoppingSession {
  id: string;          // sessionCode (UUID)
  databaseId: string;
  storeName: string;
  workerId: string;
  storeId?: string | null;
  status: SessionStatus;
  joinedCustomerName?: string | null;
  joinedCustomerEmail?: string | null;
  joinedAt?: string | null;
  createdAt: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  sessionCode: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  _id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stockQty: number;
  active: boolean;
  imageUrl?: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";
export type PaymentMethod = "UPI" | "CASH" | "CARD";

export interface OrderItemSnapshot {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  lineTotal: number;
}

export interface Order {
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
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  createdAt: string;
}

// ─── Vision ───────────────────────────────────────────────────────────────────

export interface VisionDecodeResult {
  barcode: string;
  format: string;
  confidence: number;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Navigation types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  QRScan: undefined;
  JoinSession: { code: string };
  Shopping: { sessionCode: string; customerName: string; storeName: string };
  CartReview: { sessionCode: string };
  PaymentPending: { orderId: string; sessionCode: string };
  Receipt: { orderId: string };
  History: undefined;
};

export type MainTabParamList = {
  ShopTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};
