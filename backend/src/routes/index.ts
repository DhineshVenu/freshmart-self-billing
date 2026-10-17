/**
 * @module routes/index
 * Barrel file — re-exports every Express Router from a single entry point.
 */

export { default as sessionRoutes } from "./sessionRoutes.js";
export { default as productRoutes } from "./productRoutes.js";
export { default as cartRoutes } from "./cartRoutes.js";
export { default as authRoutes } from "./authRoutes.js";
export { default as workerRoutes } from "./workerRoutes.js";
export { default as checkoutRoutes } from "./checkoutRoutes.js";
export { default as adminRoutes } from "./adminRoutes.js";
export { default as storeRoutes } from "./storeRoutes.js";
export { default as inventoryRoutes } from "./inventoryRoutes.js";
export { default as reportRoutes } from "./reportRoutes.js";
export { default as visionRoutes } from "./visionRoutes.js";
export { default as pushRoutes } from "./pushRoutes.js";
