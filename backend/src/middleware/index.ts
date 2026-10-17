/**
 * @module middleware/index
 * Barrel file — re-exports all Express middleware and request type extensions.
 *
 * Consumers can write:
 *   import { authenticateToken, requireRole, AuthenticatedRequest } from "../middleware/index.js"
 * instead of one import per middleware file.
 */

export {
  generateToken,
  authenticateToken,
  requireRole,
} from "./auth.js";
export type { AuthenticatedRequest, AuthenticatedUser } from "./auth.js";
