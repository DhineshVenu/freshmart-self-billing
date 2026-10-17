/**
 * @module models/index
 * Barrel file — re-exports every Mongoose model and its TypeScript interfaces.
 */

export { default as Product } from "./Product.js";
export type { IProduct } from "./Product.js";

export { default as Cart } from "./Cart.js";
export type { ICart, ICartItem } from "./Cart.js";

export { default as ShoppingSession } from "./ShoppingSession.js";
export type { IShoppingSession } from "./ShoppingSession.js";

export { User } from "./User.js";
export type { IUser } from "./User.js";

export { Order } from "./Order.js";
export type { IOrder, PaymentMethod, IOrderItemSnapshot } from "./Order.js";

export { Payment } from "./Payment.js";
export type { IPayment } from "./Payment.js";

export { AuditLog } from "./AuditLog.js";
export type { IAuditLog } from "./AuditLog.js";

export { Store } from "./Store.js";
export type { IStore } from "./Store.js";

export { InventoryAlert } from "./InventoryAlert.js";
export type { IInventoryAlert } from "./InventoryAlert.js";

export { DailySalesSnapshot } from "./DailySalesSnapshot.js";
export type { IDailySalesSnapshot, ICategoryBreakdown } from "./DailySalesSnapshot.js";

export { PushToken } from "./PushToken.js";
export type { IPushToken } from "./PushToken.js";
