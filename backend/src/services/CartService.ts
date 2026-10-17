import Cart, { ICart, ICartItem } from "../models/Cart.js";
import Product from "../models/Product.js";
import ShoppingSession from "../models/ShoppingSession.js";
import {
  AddToCartDTO,
  CartItemResponse,
  CartResponseData,
  UpdateCartItemQtyDTO,
} from "../dtos/cart.dto.js";
import { SupermarketDomain } from "../utils/SupermarketDomain.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";
import { sessionSyncService } from "./SessionSyncService.js";

/**
 * CartService class encapsulating server-controlled cart calculations,
 * stock validation, tax computations, and line total updates.
 * Tax logic is centralised in SupermarketDomain.TaxEngine.
 */
@Singleton
export class CartService {

  /**
   * Private helper to format ICart Mongoose document to clean CartResponseData DTO.
   */
  private async formatCartResponse(cart: ICart): Promise<CartResponseData> {
    const productIds = cart.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items: CartItemResponse[] = cart.items.map((item) => {
      const p = productMap.get(item.productId.toString());
      return {
        productId: item.productId.toString(),
        barcode: item.barcode,
        name: item.name,
        category: p?.category || "General",
        unit: p?.unit || "1 unit",
        price: item.price,
        quantity: item.quantity,
        availableStock: p ? p.stockQty : 0,
        lineTotal: Number(item.lineTotal.toFixed(2)),
      };
    });

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = Number(cart.totalAmount.toFixed(2));
    const { taxAmount, totalAmount } = SupermarketDomain.TaxEngine.calculateTax(subtotal);

    return {
      sessionCode: cart.sessionCode,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      itemCount,
    };
  }

  /**
   * Private helper to recalculate cart total amount.
   */
  private recalculateCartTotals(cart: ICart): void {
    let subtotal = 0;
    for (const item of cart.items) {
      item.lineTotal = Number((item.price * item.quantity).toFixed(2));
      subtotal += item.lineTotal;
    }
    cart.totalAmount = Number(subtotal.toFixed(2));
  }

  /**
   * Get active shopping session cart or create an empty one.
   */
  @LogExecution
  @ValidateInput
  public async getCartBySessionCode(
    sessionCode: string
  ): Promise<CartResponseData> {
    if (!sessionCode || !sessionCode.trim()) {
      throw new Error("Session code is required");
    }

    let cart = await Cart.findOne({ sessionCode: sessionCode.trim() });

    if (!cart) {
      cart = await Cart.create({
        sessionCode: sessionCode.trim(),
        items: [],
        totalAmount: 0,
      });
    }

    return this.formatCartResponse(cart);
  }

  /**
   * Add a product to current shopping cart by barcode.
   */
  @LogExecution
  public async addItemToCart(dto: AddToCartDTO): Promise<CartResponseData> {
    const { sessionCode, barcode, quantity = 1 } = dto;

    if (!sessionCode || !sessionCode.trim()) {
      throw new Error("Session code is required");
    }

    if (!barcode || !barcode.trim()) {
      throw new Error("Product barcode is required");
    }

    // Verify session status
    const session = await ShoppingSession.findOne({
      sessionCode: sessionCode.trim(),
    });

    if (!session) {
      throw new Error("Shopping session not found");
    }

    if (session.status !== "ACTIVE") {
      throw new Error(`Cannot modify cart for session with status '${session.status}'`);
    }

    // Find active product
    const product = await Product.findOne({
      barcode: barcode.trim(),
      active: true,
    });

    if (!product) {
      throw new Error(`Product with barcode '${barcode}' not found`);
    }

    if (product.stockQty <= 0) {
      throw new Error(`'${product.name}' is currently out of stock`);
    }

    let cart = await Cart.findOne({ sessionCode: sessionCode.trim() });
    if (!cart) {
      cart = new Cart({
        sessionCode: sessionCode.trim(),
        items: [],
        totalAmount: 0,
      });
    }

    // Check existing item in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === product._id.toString()
    );

    const currentQtyInCart =
      existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const requestedTotalQty = currentQtyInCart + quantity;

    if (requestedTotalQty > product.stockQty) {
      throw new Error(
        `Cannot add ${quantity} more '${product.name}'. Max available in stock: ${product.stockQty} (already in cart: ${currentQtyInCart})`
      );
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = requestedTotalQty;
      cart.items[existingItemIndex].lineTotal = Number(
        (product.price * requestedTotalQty).toFixed(2)
      );
    } else {
      const newItem: ICartItem = {
        productId: product._id as any,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        quantity,
        lineTotal: Number((product.price * quantity).toFixed(2)),
      };
      cart.items.push(newItem);
    }

    this.recalculateCartTotals(cart);
    await cart.save();

    const response = await this.formatCartResponse(cart);
    sessionSyncService.broadcast(cart.sessionCode, "CART_UPDATED", response);
    return response;
  }

  /**
   * Update quantity of a product in the cart (or remove if qty <= 0).
   */
  @LogExecution
  public async updateItemQuantity(
    dto: UpdateCartItemQtyDTO
  ): Promise<CartResponseData> {
    const { sessionCode, productId, quantity } = dto;

    const cart = await Cart.findOne({ sessionCode: sessionCode.trim() });
    if (!cart) {
      throw new Error("Cart not found for this session");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      throw new Error("Item not found in cart");
    }

    if (quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Re-check stock limit
      const product = await Product.findById(productId);
      if (product && quantity > product.stockQty) {
        throw new Error(
          `Cannot increase to ${quantity}. Maximum available stock for '${product.name}' is ${product.stockQty}`
        );
      }
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].lineTotal = Number(
        (cart.items[itemIndex].price * quantity).toFixed(2)
      );
    }

    this.recalculateCartTotals(cart);
    await cart.save();

    const response = await this.formatCartResponse(cart);
    sessionSyncService.broadcast(cart.sessionCode, "CART_UPDATED", response);
    return response;
  }

  /**
   * Remove a single item completely from the cart.
   */
  @LogExecution
  @ValidateInput
  public async removeItemFromCart(
    sessionCode: string,
    productId: string
  ): Promise<CartResponseData> {
    const cart = await Cart.findOne({ sessionCode: sessionCode.trim() });
    if (!cart) {
      throw new Error("Cart not found for this session");
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    this.recalculateCartTotals(cart);
    await cart.save();

    const response = await this.formatCartResponse(cart);
    sessionSyncService.broadcast(cart.sessionCode, "CART_UPDATED", response);
    return response;
  }
}
