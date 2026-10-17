import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
// Barrel imports — one line per layer instead of one line per file
import {
  sessionRoutes,
  productRoutes,
  cartRoutes,
  authRoutes,
  workerRoutes,
  checkoutRoutes,
  adminRoutes,
  storeRoutes,
  inventoryRoutes,
  reportRoutes,
  visionRoutes,
  pushRoutes,
} from "./routes/index.js";
import connectDatabase from "./config/db.js";
import { authService, ProductService, storeService, reportService } from "./services/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers (helmet)
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow ZXing barcode scanner wasm in browser
    contentSecurityPolicy: false,     // SPA served from NGINX; CSP handled at edge
  })
);

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Rate limiter — auth endpoints only (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

// Health-check route
app.get("/api/health", (_request: Request, response: Response) => {
  response.status(200).json({
    success: true,
    message: "Supermarket backend is running with TypeScript & OOP Architecture",
  });
});

// Business Domain Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/workers", workerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/stores", storeRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/vision", visionRoutes);
app.use("/api/v1/push", pushRoutes);
app.use("/api/v1", checkoutRoutes);

// Retain compatibility routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);

// Route-not-found middleware
app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Error-handling middleware
app.use(
  (
    error: Error & { statusCode?: number },
    _request: Request,
    response: Response,
    _next: NextFunction
  ) => {
    const statusCode =
      response.statusCode && response.statusCode !== 200
        ? response.statusCode
        : error.statusCode || 500;

    response.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
);

const startServer = async (): Promise<void> => {
  await connectDatabase();

  // Seed default admin & worker accounts + products + store
  await authService.seedDefaultAccounts();
  const productService = new ProductService();
  await productService.seedDefaultProducts();
  await storeService.seedDefaultStore();

  // Nightly snapshot job: runs at 00:05 every day
  cron.schedule("5 0 * * *", async () => {
    try {
      const stores = await (await import("./models/Store.js")).Store.find({ active: true }).select("_id").lean();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Generate for all stores + a global (no-store) snapshot
      const jobs = [
        reportService.generateDailySnapshot(undefined, yesterday),
        ...stores.map((s) => reportService.generateDailySnapshot(String(s._id), yesterday)),
      ];
      await Promise.allSettled(jobs);
      console.log(`📊 Nightly snapshot generated for ${stores.length + 1} store(s)`);
    } catch (err) {
      console.error("⚠️ Nightly snapshot cron error:", err);
    }
  });
  console.log("⏰ Nightly report snapshot scheduled (00:05 daily)");

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer();
