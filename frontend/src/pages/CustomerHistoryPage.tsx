import { useEffect, useState } from "react";
import {
  FiClock,
  FiShoppingBag,
  FiFileText,
  FiSearch,
  FiRefreshCw,
  FiUser,
  FiArrowRight,
} from "react-icons/fi";
import { getOrderBill, type OrderData } from "../services/checkoutApi";
import { DigitalBillModal } from "../components/DigitalBillModal";
import { Toast, type ToastType } from "../components/Toast";
import "./CustomerHistoryPage.css";

interface CustomerHistoryPageProps {
  onBackToShopping?: () => void;
}

function CustomerHistoryPage({ onBackToShopping }: CustomerHistoryPageProps) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:5000/api/v1/orders");
      const body = await res.json();
      if (body.success) {
        setOrders(body.data.orders);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load purchase history";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");

  // Defensive deduplication: if an order is PAID for a sessionId, exclude any duplicate PENDING orders for that sessionId
  const paidSessionIds = new Set(
    orders.filter((o) => o.status === "PAID").map((o) => o.sessionId).filter(Boolean)
  );

  const deduplicatedOrders = orders.filter((o) => {
    if (o.status === "CANCELLED") return false;
    if (o.status === "PENDING" && o.sessionId && paidSessionIds.has(o.sessionId)) {
      return false; // Skip orphaned duplicate pending checkout
    }
    return true;
  });

  const filteredOrders = deduplicatedOrders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    const matchesSearch =
      o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <main className="history-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="history-container">
        <header className="history-header">
          <div className="history-title-group">
            <div className="history-icon-pill">
              <FiFileText />
            </div>
            <div>
              <span className="history-sub">CUSTOMER PURCHASE RECORDS</span>
              <h1>My Digital GST Bills & Orders</h1>
            </div>
          </div>

          <div className="history-header-actions">
            {onBackToShopping && (
              <button type="button" className="back-btn" onClick={onBackToShopping}>
                <FiShoppingBag /> Back to Shopping Cart
              </button>
            )}
            <button type="button" className="refresh-btn" onClick={fetchOrders}>
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        {/* Filter & Search Bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="history-search-bar" style={{ flex: 1, minWidth: "260px", marginBottom: 0 }}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              placeholder="Search by Order #, Store, or Customer Name..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: statusFilter === "ALL" ? "#047857" : "#1e293b",
                color: "#ffffff",
              }}
            >
              All Records ({deduplicatedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PAID")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: statusFilter === "PAID" ? "#047857" : "#1e293b",
                color: "#ffffff",
              }}
            >
              Paid Bills ({deduplicatedOrders.filter((o) => o.status === "PAID").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: statusFilter === "PENDING" ? "#d97706" : "#1e293b",
                color: "#ffffff",
              }}
            >
              Pending ({deduplicatedOrders.filter((o) => o.status === "PENDING").length})
            </button>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="history-loading">
            <FiRefreshCw className="spin-icon large" />
            <p>Loading digital order receipts...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="history-empty">
            <FiShoppingBag className="empty-icon" />
            <h3>No Order Receipts Found</h3>
            <p>Complete a self-billing checkout to view digital bills here.</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-no-tag">{order.orderNo}</span>
                    <h3 className="store-name">{order.storeName}</h3>
                  </div>
                  <span className={`status-chip ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>

                <div className="order-details-meta">
                  <div className="meta-item">
                    <FiUser className="icon" /> {order.customerName}
                  </div>
                  <div className="meta-item">
                    <FiClock className="icon" /> {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <div className="meta-item">
                    <FiShoppingBag className="icon" /> {order.items.length} items
                  </div>
                </div>

                <div className="order-card-footer">
                  <div className="amount-stack font-mono">
                    <span className="total-label">Grand Total</span>
                    <strong className="total-val">₹{order.totalAmount.toFixed(2)}</strong>
                  </div>

                  <button
                    type="button"
                    className="view-receipt-btn"
                    onClick={async () => {
                      try {
                        const bill = await getOrderBill(order._id);
                        setSelectedOrder(bill);
                      } catch {
                        setSelectedOrder(order);
                      }
                    }}
                  >
                    <span>View Bill</span>
                    <FiArrowRight />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bill Receipt Modal */}
      {selectedOrder && (
        <DigitalBillModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </main>
  );
}

export default CustomerHistoryPage;
