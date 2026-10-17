import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/User.js";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required.");
  }
  return secret;
};

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "24h" });
};

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Check cookie or Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
    return;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (error) {
    next(error);
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Session expired or token invalid." },
    });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires one of roles: [${roles.join(", ")}]`,
        },
      });
      return;
    }

    next();
  };
};
