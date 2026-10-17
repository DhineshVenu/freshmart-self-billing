import { useEffect, useState } from "react";
import {
  FiShield,
  FiPlus,
  FiRefreshCw,
  FiCheckCircle,
  FiUser,
  FiFileText,
  FiArrowRight,
} from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import { createShoppingSession } from "../services/sessionApi";
import { confirmPayment, getOrderBill, type OrderData } from "../services/checkoutApi";
import type { ShoppingSessionData } from "../types/session";
import { DigitalBillModal } from "../components/DigitalBillModal";
import { Toast, type ToastType } from "../components/Toast";
import "./WorkerDashboardPage.css";

interface WorkerDashboardPageProps {
  onNavigateToJoin?: (sessionCode: string) => void;
}

function WorkerDashboardPage({ onNavigateToJoin }: WorkerDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "payments" | "create">("sessions");
  const [sessions, setSessions] = useState<ShoppingSessionData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Session Generation
  const [storeName, setStoreName] = useState("Fresh Mart Downtown");
  const [createdSession, setCreatedSession] = useState<ShoppingSessionData | null>(null);
  const [joinUrl, setJoinUrl] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sessionsRes, ordersRes] = await Promise.all([
        fetch("http://localhost:5000/api/sessions").then((r) => r.json()),
        fetch("http://localhost:5000/api/v1/orders").then((r) => r.json()),
      ]);

      if (sessionsRes.success) {
        setSessions(sessionsRes.data.sessions);
      }
      if (ordersRes.success) {
        setOrders(ordersRes.data.orders);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load worker dashboard";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      // Background silent live sync
      fetch("http://localhost:5000/api/sessions")
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setSessions(res.data.sessions);
        })
        .catch(() => {});

      fetch("http://localhost:5000/api/v1/orders")
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setOrders(res.data.orders);
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!createdSession?.id) return;
    const es = new EventSource(
      `http://localhost:5000/api/sessions/${createdSession.id}/stream`
    );
    es.addEventListener("CART_UPDATED", () => {
      loadData();
    });
    es.addEventListener("CHECKOUT_PENDING", () => {
      loadData();
      setToast({
        message: "Customer initiated checkout! Pending counter payment confirmation.",
        type: "info",
      });
    });
    return () => es.close();
  }, [createdSession?.id]);

  const handleCreateSession = async () => {
    try {
      setIsLoading(true);
      const res = await createShoppingSession(storeName);
      setCreatedSession(res.data.session);
      setJoinUrl(res.data.joinUrl);
      setToast({ message: "Shopping QR session generated ✓", type: "success" });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Session creation failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      setIsConfirming(true);
      const res = await confirmPayment(orderId);
      setToast({ message: `Payment confirmed for ${res.order.orderNo} ✓`, type: "success" });
      setSelectedOrder(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment confirmation failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsConfirming(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING");

  return (
    <main className="worker-dash-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="worker-dash-container">
        {/* Worker Header */}
        <header className="worker-dash-header">
          <div className="brand-group">
            <div className="header-icon-pill">
              <FiShield />
            </div>
            <div>
              <span className="sub-tag">POS EXIT & COUNTER TERMINAL</span>
              <h1>Worker Operations Terminal</h1>
            </div>
          </div>

          <div className="header-tabs">
            <button
              type="button"
              className={`dash-tab ${activeTab === "sessions" ? "active" : ""}`}
              onClick={() => setActiveTab("sessions")}
            >
              <FiUser /> Active Sessions ({sessions.length})
            </button>

            <button
              type="button"
              className={`dash-tab ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              <FiCheckCircle /> Counter Payments ({pendingOrders.length} Pending)
            </button>

            <button
              type="button"
              className={`dash-tab ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              <FiPlus /> Issue Session QR
            </button>

            <button type="button" className="refresh-action-btn" onClick={loadData}>
              <FiRefreshCw />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="dash-loading-box">
            <FiRefreshCw className="spin-icon large" />
            <p>Synchronizing Worker Counter State...</p>
          </div>
        ) : (
          <div className="dash-content-body">
            {/* Active Sessions Tab */}
            {activeTab === "sessions" && (
              <div className="sessions-tab">
                <div className="table-card">
                  <h3>Walk-In Customer Sessions</h3>
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Session Code</th>
                        <th>Outlet Name</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Created Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id}>
                          <td><code>#{s.id.slice(0, 8)}</code></td>
                          <td><strong>{s.storeName}</strong></td>
                          <td>
                            {s.joinedCustomerName ? (
                              <span className="customer-badge">
                                <FiUser /> {s.joinedCustomerName}
                              </span>
                            ) : (
                              <span className="unclaimed-badge">Unclaimed</span>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${s.status.toLowerCase()}`}>
                              {s.status}
                            </span>
                          </td>
                          <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                          <td>
                            {onNavigateToJoin && s.status === "ACTIVE" && (
                              <button
                                type="button"
                                className="join-sim-btn"
                                onClick={() => onNavigateToJoin(s.id)}
                              >
                                Join <FiArrowRight />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Counter Payments Tab */}
            {activeTab === "payments" && (
              <div className="payments-tab">
                <div className="table-card">
                  <h3>Pending Exit Counter Payments</h3>
                  {orders.length === 0 ? (
                    <div className="empty-box">No orders registered yet</div>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Outlet</th>
                          <th>Items</th>
                          <th>Grand Total</th>
                          <th>Status</th>
                          <th>Counter Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o._id}>
                            <td><strong>{o.orderNo}</strong></td>
                            <td>{o.customerName}</td>
                            <td>{o.storeName}</td>
                            <td>{o.items.length} items</td>
                            <td><strong className="amount font-mono">₹{o.totalAmount.toFixed(2)}</strong></td>
                            <td>
                              <span className={`status-pill ${o.status.toLowerCase()}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-cell">
                                <button
                                  type="button"
                                  className="view-bill-action-btn"
                                  onClick={async () => {
                                    const bill = await getOrderBill(o._id);
                                    setSelectedOrder(bill);
                                  }}
                                >
                                  <FiFileText /> View Invoice
                                </button>
                                {o.status === "PENDING" && (
                                  <button
                                    type="button"
                                    className="confirm-pay-btn"
                                    onClick={() => handleConfirmPayment(o._id)}
                                    disabled={isConfirming}
                                  >
                                    <FiCheckCircle /> Confirm ₹
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Create Session Tab */}
            {activeTab === "create" && (
              <div className="create-tab">
                <div className="create-card">
                  <h3>Issue New Shopping Session Token</h3>
                  {!createdSession ? (
                    <div className="create-form-wrap">
                      <div className="form-group">
                        <label>Supermarket Outlet Name</label>
                        <input
                          type="text"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                        />
                      </div>
                      <button type="button" className="gen-btn" onClick={handleCreateSession}>
                        <FiPlus /> Generate Shopping QR Code
                      </button>
                    </div>
                  ) : (
                    <div className="qr-result-box">
                      <QRCodeSVG value={joinUrl} size={200} level="H" />
                      <div className="token-code font-mono">#{createdSession.id}</div>
                      <p>Customer scans QR code to begin barcode scanning.</p>
                      <button
                        type="button"
                        className="reset-session-btn"
                        onClick={() => {
                          setCreatedSession(null);
                          setJoinUrl("");
                        }}
                      >
                        Create Another Session
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bill View Modal */}
      {selectedOrder && (
        <DigitalBillModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirmPayment={() => handleConfirmPayment(selectedOrder._id)}
          isConfirming={isConfirming}
        />
      )}
    </main>
  );
}

export default WorkerDashboardPage;
