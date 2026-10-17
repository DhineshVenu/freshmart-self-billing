import { Request, Response, NextFunction } from "express";
import { BaseController } from "./BaseController.js";
import { ProductService } from "../services/ProductService.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { AuditLog } from "../models/AuditLog.js";

export class ProductController extends BaseController {
  private readonly productService: ProductService;

  constructor() {
    super();
    this.productService = new ProductService();
  }

  public getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const category = req.query.category as string | undefined;
      const products = await this.productService.getAllProducts(category);
      this.sendSuccess(res, { products }, 200);
    } catch (error) {
      next(error);
    }
  };

  public getAllAdmin = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const products = await this.productService.getAllProductsAdmin();
      this.sendSuccess(res, { products }, 200);
    } catch (error) {
      next(error);
    }
  };

  public getByBarcode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const barcode = Array.isArray(req.params.barcode)
        ? req.params.barcode[0]
        : req.params.barcode;

      const product = await this.productService.getProductByBarcode(barcode);
      this.sendSuccess(res, { product }, 200);
    } catch (error) {
      next(error);
    }
  };

  public create = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const product = await this.productService.createProduct(req.body);

      await AuditLog.create({
        actorId: req.user?.userId || "admin",
        actorRole: req.user?.role || "admin",
        action: "CREATE_PRODUCT",
        targetType: "Product",
        targetId: String(product._id),
        details: `Created product '${product.name}' (#${product.barcode}) @ ₹${product.price}`,
      });

      this.sendSuccess(res, { product }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product.";
      this.sendError(res, msg, 400);
    }
  };

  public update = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const productId = Array.isArray(id) ? id[0] : id;
      const product = await this.productService.updateProduct(productId, req.body);

      await AuditLog.create({
        actorId: req.user?.userId || "admin",
        actorRole: req.user?.role || "admin",
        action: "UPDATE_PRODUCT",
        targetType: "Product",
        targetId: productId,
        details: `Updated product inventory for ${product?.name}`,
      });

      this.sendSuccess(res, { product }, 200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update product.";
      this.sendError(res, msg, 400);
    }
  };

  public delete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const productId = Array.isArray(id) ? id[0] : id;
      const product = await this.productService.deleteProduct(productId);

      await AuditLog.create({
        actorId: req.user?.userId || "admin",
        actorRole: req.user?.role || "admin",
        action: "SOFT_DELETE_PRODUCT",
        targetType: "Product",
        targetId: productId,
        details: `Deactivated product '${product?.name}'`,
      });

      this.sendSuccess(res, { product }, 200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate product.";
      this.sendError(res, msg, 400);
    }
  };
}

export const productController = new ProductController();
