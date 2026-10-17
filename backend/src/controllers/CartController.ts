import { Request, Response, NextFunction } from "express";
import { BaseController } from "./BaseController.js";
import { CartService } from "../services/CartService.js";

export class CartController extends BaseController {
  private readonly cartService: CartService;

  constructor() {
    super();
    this.cartService = new CartService();
  }

  public getCart = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sessionCode = (req.params.sessionCode || req.query.sessionCode) as string;
      const cart = await this.cartService.getCartBySessionCode(sessionCode);
      this.sendSuccess(res, { cart }, 200);
    } catch (error) {
      next(error);
    }
  };

  public addItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sessionCode = (req.params.sessionCode || req.body.sessionCode) as string;
      const { barcode, quantity } = req.body;
      const cart = await this.cartService.addItemToCart({
        sessionCode,
        barcode,
        quantity: quantity ? Number(quantity) : 1,
      });
      this.sendSuccess(res, { cart }, 200, "Item added to cart");
    } catch (error) {
      next(error);
    }
  };

  public updateItemQty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = Array.isArray(req.params.productId)
        ? req.params.productId[0]
        : req.params.productId;
      const sessionCode = (req.params.sessionCode || req.body.sessionCode) as string;
      const { quantity } = req.body;

      const cart = await this.cartService.updateItemQuantity({
        sessionCode,
        productId,
        quantity: Number(quantity),
      });

      this.sendSuccess(res, { cart }, 200, "Cart updated");
    } catch (error) {
      next(error);
    }
  };

  public deleteItem = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = Array.isArray(req.params.productId)
        ? req.params.productId[0]
        : req.params.productId;
      const sessionCode = (req.params.sessionCode || req.query.sessionCode) as string;

      const cart = await this.cartService.removeItemFromCart(
        sessionCode,
        productId
      );

      this.sendSuccess(res, { cart }, 200, "Item removed from cart");
    } catch (error) {
      next(error);
    }
  };
}

export const cartController = new CartController();
