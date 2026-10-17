import { useEffect, useState } from "react";
import {
  FiShoppingCart,
  FiCamera,
  FiSearch,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiArrowRight,
  FiLogOut,
  FiTag,
  FiPackage,
  FiUser,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiShoppingBag,
  FiClock,
} from "react-icons/fi";
import {
  addToCart,
  deleteCartItem,
  getCart,
  getProducts,
  updateCartItemQty,
} from "../services/cartApi";
import {
  processCheckout,
  confirmPayment,
  getSessionOrders,
  type OrderData,
  type PaymentData,
} from "../services/checkoutApi";
import type { CartData, ProductData } from "../types/cart";
import { CameraScanner } from "../components/CameraScanner";
import { DigitalBillModal } from "../components/DigitalBillModal";
import { Toast, type ToastType } from "../components/Toast";
import { playScanBeep } from "../utils/audio";
import "./ShoppingPage.css";

interface ShoppingPageProps {
  sessionCode: string;
  customerName?: string;
  storeName?: string;
  onLeaveSession?: () => void;
  onSessionComplete?: () => void;
  onNavigateToHistory?: () => void;
}

const CATEGORIES = [
  "All",
  "Dairy",
  "Bakery",
  "Produce",
  "Beverages",
  "Snacks",
  "Pantry",
];

function ShoppingPage({
  sessionCode,
  customerName = "Customer",
  storeName = "Fresh Mart Downtown",
  onLeaveSession,
  onSessionComplete,
  onNavigateToHistory,
}: ShoppingPageProps) {
  const [cart, setCart] = useState<CartData | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showBillModal, setShowBillModal] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<OrderData | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const [cartData, productsList, sessionOrders] = await Promise.all([
          getCart(sessionCode),
          getProducts(selectedCategory),
          getSessionOrders(sessionCode).catch(() => []),
        ]);
        setCart(cartData);
        setAvailableProducts(productsList);
        if (sessionOrders && sessionOrders.length > 0) {
          const latestOrder = sessionOrders[0];
          setActiveOrder(latestOrder);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load shopping session cart";
        setToast({ message: msg, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionCode) {
      initializeData();
    }
  }, [sessionCode, selectedCategory]);

  useEffect(() => {
    if (!sessionCode) return;

    // Connect to real-time Server-Sent Events stream
    const eventSource = new EventSource(`http://localhost:5000/api/sessions/${sessionCode}/stream`);

    eventSource.addEventListener("CART_UPDATED", (event: MessageEvent) => {
      try {
        const updatedCart = JSON.parse(event.data);
        setCart(updatedCart);
      } catch {
        // ignore parse error
      }
    });

    eventSource.addEventListener("PAYMENT_CONFIRMED", (event: MessageEvent) => {
      try {
        const { order, payment } = JSON.parse(event.data);
        setActiveOrder(order);
        setActivePayment(payment);
        setShowBillModal(true);
        setToast({
          message: "Payment confirmed at worker POS! Verified GST Invoice ready.",
          type: "success",
        });
      } catch {
        // ignore parse error
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionCode]);

  const handleAddBarcode = async (barcodeToAdd?: string): Promise<void> => {
    const codeToUse = barcodeToAdd || scannedBarcode;
    if (!codeToUse.trim()) {
      setToast({ message: "Please enter or scan a valid product barcode.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedCart = await addToCart(sessionCode, codeToUse.trim());
      setCart(updatedCart);
      setScannedBarcode("");
      playScanBeep();
      setToast({
        message: `Scanned & added to virtual cart ✓`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to add product to cart";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQty = async (
    productId: string,
    newQty: number
  ): Promise<void> => {
    try {
      setIsSubmitting(true);
      const updatedCart = await updateCartItemQty(
        sessionCode,
        productId,
        newQty
      );
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update item quantity";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (productId: string, name: string): Promise<void> => {
    try {
      setIsSubmitting(true);
      const updatedCart = await deleteCartItem(sessionCode, productId);
      setCart(updatedCart);
      setToast({ message: `Removed '${name}' from cart`, type: "info" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to remove item from cart";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = availableProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <main className="shopping-experience-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Banner Navigation */}
      <header className="shopping-pos-header">
        <div className="header-info-group">
          <div className="store-pill-badge">
            <FiPackage className="store-icon-small" />
            <span>{storeName}</span>
          </div>
          <h1>Self-Billing POS Terminal</h1>
          <div className="customer-session-strip">
            <span className="customer-info-chip">
              <FiUser className="chip-icon" /> <strong>{customerName}</strong>
            </span>
            <span className="session-code-chip">
              Session: <code>#{sessionCode.slice(0, 8)}</code>
            </span>
          </div>
        </div>

        <div className="header-actions-group">
          <div className="cart-badge-pill">
            <FiShoppingCart className="cart-badge-icon" />
            <span className="cart-items-qty">
              {cart ? cart.itemCount : 0} items
            </span>
            <span className="cart-subtotal-val">
              ₹{cart ? cart.totalAmount.toFixed(2) : "0.00"}
            </span>
          </div>

          {onLeaveSession && (
            <button
              type="button"
              className="leave-session-btn"
              onClick={onLeaveSession}
              title="Exit and leave active session"
            >
              <FiLogOut /> <span>Exit</span>
            </button>
          )}
        </div>
      </header>

      {activeOrder && activeOrder.status === "PAID" ? (
        <div className="order-completed-view">
          <div className="completed-card">
            <div className="completed-icon-wrap">
              <FiCheckCircle className="completion-check-icon" />
            </div>
            <h2>Order Completed & Bill Settled!</h2>
            <p className="completed-subtitle">
              Tax Invoice <strong>#{activeOrder.orderNo}</strong> has been successfully paid and verified.
            </p>

            <div className="completed-summary-grid">
              <div className="summary-stat-box">
                <span className="stat-label">Total Amount Paid</span>
                <span className="stat-val total">₹{activeOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">Payment Mode</span>
                <span className="stat-val">{activeOrder.paymentMethod || "UPI"}</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">Items Purchased</span>
                <span className="stat-val">{activeOrder.items.length} items</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">Verification Status</span>
                <span className="stat-val status-badge-paid">VERIFIED PAID ✓</span>
              </div>
            </div>

            <div className="completed-action-buttons">
              <button
                type="button"
                className="view-bill-action-btn"
                onClick={() => setShowBillModal(true)}
              >
                <FiFileText /> <span>View & Print Tax Invoice</span>
              </button>
              {onNavigateToHistory && (
                <button
                  type="button"
                  className="history-action-btn"
                  onClick={onNavigateToHistory}
                >
                  <FiClock /> <span>View All Receipts</span>
                </button>
              )}
              <button
                type="button"
                className="new-session-action-btn"
                onClick={() => {
                  if (onSessionComplete) {
                    onSessionComplete();
                  } else if (onLeaveSession) {
                    onLeaveSession();
                  }
                }}
              >
                <FiShoppingBag /> <span>Start New Shopping Session</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {activeOrder && activeOrder.status === "PENDING" && (
            <div className="pending-checkout-alert">
              <div className="alert-content">
                <FiAlertCircle className="alert-icon" />
                <div>
                  <strong>Checkout Generated - Payment Pending</strong>
                  <p>Invoice #{activeOrder.orderNo} (₹{activeOrder.totalAmount.toFixed(2)}) is awaiting payment confirmation.</p>
                </div>
              </div>
              <button
                type="button"
                className="open-pending-bill-btn"
                onClick={() => setShowBillModal(true)}
              >
                <FiFileText /> View Bill & Pay
              </button>
            </div>
          )}

          <div className="shopping-main-grid">
        {/* Left Column: Barcode Scanning & Product Inventory Catalog */}
        <section className="catalog-scanning-col">
          <div className="scanner-control-card">
            <div className="scanner-card-header">
              <div className="header-title-box">
                <FiCamera className="scan-icon" />
                <h2>Barcode Product Scanner</h2>
              </div>
              <button
                type="button"
                className={`camera-toggle-btn ${showCamera ? "active" : ""}`}
                onClick={() => setShowCamera(!showCamera)}
              >
                <FiCamera /> {showCamera ? "Close Camera" : "Open Camera Scanner"}
              </button>
            </div>

            {/* Live Camera Scanner Container */}
            {showCamera && (
              <CameraScanner
                onScanSuccess={(code) => handleAddBarcode(code)}
                onClose={() => setShowCamera(false)}
              />
            )}

            {/* Manual Barcode Input */}
            <form
              className="barcode-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddBarcode();
              }}
            >
              <div className="search-input-wrap">
                <FiTag className="input-search-icon" />
                <input
                  type="text"
                  value={scannedBarcode}
                  placeholder="Scan or enter barcode (e.g. 8901)"
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  disabled={isSubmitting}
                  className="barcode-input"
                />
              </div>
              <button
                type="submit"
                className="scan-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? <FiRefreshCw className="spin-icon" /> : <FiPlus />}
                <span>Add Item</span>
              </button>
            </form>

            {/* Catalog Filter Tabs */}
            <div className="catalog-filter-bar">
              <div className="category-scroll-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-pill ${
                      selectedCategory === cat ? "active" : ""
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="search-filter-box">
                <FiSearch className="search-icon-dim" />
                <input
                  type="text"
                  value={searchQuery}
                  placeholder="Search catalog..."
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="catalog-search-input"
                />
              </div>
            </div>

            {/* Product Item Grid */}
            <div className="product-catalog-grid">
              {filteredProducts.length === 0 ? (
                <div className="no-products-box">
                  <FiPackage className="empty-package-icon" />
                  <p>No products found matching your search</p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const cartItem = cart?.items.find(
                    (i) => i.productId === product._id
                  );
                  const inCartQty = cartItem ? cartItem.quantity : 0;
                  const isOutOfStock = product.stockQty <= inCartQty;

                  return (
                    <div
                      key={product._id}
                      className={`catalog-product-card ${
                        isOutOfStock ? "out-of-stock" : ""
                      }`}
                    >
                      <div className="card-top-row">
                        <span className="category-tag-badge">
                          {product.category}
                        </span>
                        <span className="barcode-badge-chip">
                          #{product.barcode}
                        </span>
                      </div>

                      <div className="product-title-row">
                        <strong className="product-name">{product.name}</strong>
                        {product.unit && (
                          <span className="unit-label">{product.unit}</span>
                        )}
                      </div>

                      <div className="product-pricing-footer">
                        <div className="price-stack">
                          <span className="currency-symbol">₹</span>
                          <span className="price-integer">
                            {product.price.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="quick-scan-add-btn"
                          onClick={() => handleAddBarcode(product.barcode)}
                          disabled={isSubmitting || isOutOfStock}
                        >
                          {isOutOfStock ? (
                            "Sold Out"
                          ) : (
                            <>
                              <FiPlus /> Scan Item
                            </>
                          )}
                        </button>
                      </div>

                      <div className="stock-level-indicator">
                        <span
                          className={`stock-dot ${
                            product.stockQty <= 5 ? "low-stock" : ""
                          }`}
                        />
                        <span>
                          {product.stockQty <= 5
                            ? `Only ${product.stockQty} left in stock!`
                            : `Stock: ${product.stockQty}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Live Server-Controlled Virtual Cart */}
        <section className="virtual-cart-col">
          <div className="virtual-cart-card">
            <div className="cart-header-row">
              <div className="cart-title-left">
                <FiShoppingCart className="cart-main-icon" />
                <h2>Virtual Shopping Cart</h2>
              </div>
              <span className="verified-live-tag">
                <span className="pulse-dot" /> LIVE VERIFIED
              </span>
            </div>

            {isLoading ? (
              <div className="cart-loading-state">
                <FiRefreshCw className="spin-icon large" />
                <p>Synchronizing cart with MongoDB...</p>
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="cart-empty-state">
                <div className="empty-cart-circle">
                  <FiShoppingCart className="empty-cart-svg" />
                </div>
                <h3>Your Cart is Empty</h3>
                <p>
                  Scan product barcodes using the camera or select items from the
                  catalog on the left.
                </p>
              </div>
            ) : (
              <div className="cart-content-wrapper">
                {/* Cart Items List */}
                <ul className="cart-items-scroll-list">
                  {cart.items.map((item) => {
                    const isMaxStock =
                      item.availableStock > 0 &&
                      item.quantity >= item.availableStock;

                    return (
                      <li key={item.productId} className="cart-item-card">
                        <div className="item-main-details">
                          <div className="item-title-row">
                            <strong className="cart-product-title">
                              {item.name}
                            </strong>
                            <span className="cart-barcode-tag">
                              #{item.barcode}
                            </span>
                          </div>
                          <div className="cart-item-pricing-sub">
                            <span>₹{item.price.toFixed(2)}</span>
                            {item.unit && <span>/ {item.unit}</span>}
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="stepper-action-group">
                          <div className="stepper-controls">
                            <button
                              type="button"
                              className="step-btn minus"
                              onClick={() =>
                                handleUpdateQty(item.productId, item.quantity - 1)
                              }
                              disabled={isSubmitting}
                              aria-label="Decrease quantity"
                            >
                              <FiMinus />
                            </button>
                            <span className="step-count">{item.quantity}</span>
                            <button
                              type="button"
                              className="step-btn plus"
                              onClick={() =>
                                handleUpdateQty(item.productId, item.quantity + 1)
                              }
                              disabled={isSubmitting || isMaxStock}
                              aria-label="Increase quantity"
                              title={
                                isMaxStock
                                  ? "Maximum available stock reached"
                                  : "Add one more"
                              }
                            >
                              <FiPlus />
                            </button>
                          </div>

                          <div className="item-line-total">
                            ₹{item.lineTotal.toFixed(2)}
                          </div>

                          <button
                            type="button"
                            className="item-delete-btn"
                            onClick={() =>
                              handleDeleteItem(item.productId, item.name)
                            }
                            disabled={isSubmitting}
                            title="Remove from cart"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Cart Summary & Checkout Footer */}
                <footer className="cart-bill-summary">
                  <div className="bill-breakdown-table">
                    <div className="bill-row">
                      <span className="bill-label">Items Subtotal ({cart.itemCount} items)</span>
                      <span className="bill-val">₹{cart.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="bill-row">
                      <span className="bill-label">
                        GST Tax (5% included)
                      </span>
                      <span className="bill-val">₹{cart.taxAmount.toFixed(2)}</span>
                    </div>

                    <div className="bill-row grand-total-row">
                      <span className="grand-label">Grand Total Amount</span>
                      <strong className="grand-val">
                        ₹{cart.totalAmount.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="proceed-checkout-action-btn"
                    onClick={async () => {
                      if (activeOrder && activeOrder.status === "PENDING") {
                        setShowBillModal(true);
                        return;
                      }
                      try {
                        setIsSubmitting(true);
                        const result = await processCheckout(sessionCode, "UPI");
                        setActiveOrder(result.order);
                        setActivePayment(result.payment);
                        setShowBillModal(true);
                        setToast({ message: "Checkout generated! GST Invoice created ✓", type: "success" });
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Checkout failed";
                        setToast({ message: msg, type: "error" });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <span>
                      {activeOrder && activeOrder.status === "PENDING"
                        ? "Complete Pending Payment & Bill"
                        : "Proceed to Digital Checkout"}
                    </span>
                    <FiArrowRight className="btn-arrow" />
                  </button>
                </footer>
              </div>
            )}
          </div>
        </section>
      </div>
      </>
      )}

      {/* Digital GST Bill Receipt Modal */}
      {showBillModal && activeOrder && (
        <DigitalBillModal
          order={activeOrder}
          payment={activePayment || undefined}
          onClose={() => {
            setShowBillModal(false);
            if (activeOrder.status === "PAID" && onSessionComplete) {
              onSessionComplete();
            }
          }}
          onSessionComplete={onSessionComplete}
          onConfirmPayment={async () => {
            try {
              setIsSubmitting(true);
              const result = await confirmPayment(activeOrder._id);
              setActiveOrder(result.order);
              setActivePayment(result.payment);
              setToast({ message: "Payment confirmed successfully! Session completed ✓", type: "success" });
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Payment confirmation failed";
              setToast({ message: msg, type: "error" });
            } finally {
              setIsSubmitting(false);
            }
          }}
          isConfirming={isSubmitting}
        />
      )}
    </main>
  );
}

export default ShoppingPage;
