import { useEffect, useState } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiShoppingBag,
  FiAlertTriangle,
  FiRefreshCw,
  FiPlus,
  FiActivity,
  FiShield,
  FiLock,
  FiUnlock,
  FiTrash2,
} from "react-icons/fi";
import {
  fetchAdminDashboard,
  fetchWorkers,
  createWorker,
  toggleWorkerStatus,
  createProductAdmin,
  resetDemoData,
  type DashboardSummary,
  type WorkerData,
  type AuditLogData,
} from "../services/adminApi";
import { getProducts } from "../services/cartApi";
import type { ProductData } from "../types/cart";
import { loginUser } from "../services/authApi";
import { Toast, type ToastType } from "../components/Toast";
import "./AdminDashboardPage.css";

interface AdminDashboardPageProps {
  onDemoDataReset?: () => void;
}

function AdminDashboardPage({ onDemoDataReset }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "workers" | "inventory" | "audit">("overview");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Forms
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newWorkerPassword, setNewWorkerPassword] = useState("");

  const [prodBarcode, setProdBarcode] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("General");
  const [prodUnit, setProdUnit] = useState("1 unit");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [isAuthRequired, setIsAuthRequired] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("admin@freshmart.com");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setIsAuthRequired(false);
      const [dashData, workerList, productList] = await Promise.all([
        fetchAdminDashboard(),
        fetchWorkers(),
        getProducts("All"),
      ]);
      setSummary(dashData.summary);
      setAuditLogs(dashData.recentAuditLogs);
      setWorkers(workerList);
      setProducts(productList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load admin panel data";
      if (msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("token") || msg.toLowerCase().includes("denied")) {
        setIsAuthRequired(true);
      }
      setToast({ message: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsLoggingIn(true);
      await loginUser(adminEmail, adminPassword);
      setToast({ message: "Admin Authentication Successful ✓", type: "success" });
      setIsAuthRequired(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerEmail || !newWorkerPassword) {
      setToast({ message: "Please fill in all worker fields", type: "error" });
      return;
    }

    try {
      await createWorker(newWorkerName, newWorkerEmail, newWorkerPassword);
      setToast({ message: `Worker '${newWorkerName}' created successfully ✓`, type: "success" });
      setNewWorkerName("");
      setNewWorkerEmail("");
      setNewWorkerPassword("");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create worker";
      setToast({ message: msg, type: "error" });
    }
  };

  const handleToggleWorker = async (workerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      await toggleWorkerStatus(workerId, newStatus);
      setToast({ message: `Worker status changed to ${newStatus}`, type: "info" });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle worker status";
      setToast({ message: msg, type: "error" });
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodBarcode || !prodName || !prodPrice) {
      setToast({ message: "Barcode, Product Name, and Price are required", type: "error" });
      return;
    }

    try {
      await createProductAdmin({
        barcode: prodBarcode,
        name: prodName,
        category: prodCategory,
        unit: prodUnit,
        price: parseFloat(prodPrice),
        stockQty: parseInt(prodStock || "50", 10),
      });

      setToast({ message: `Product '${prodName}' added to inventory ✓`, type: "success" });
      setProdBarcode("");
      setProdName("");
      setProdPrice("");
      setProdStock("");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product";
      setToast({ message: msg, type: "error" });
    }
  };

  const handleResetDemoData = async () => {
    const confirmed = window.confirm(
      "Reset demo data? This will clear sessions, carts, orders, payments, and audit logs."
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      const result = await resetDemoData();

      sessionStorage.removeItem("app_active_session");
      sessionStorage.removeItem("app_session_code");
      sessionStorage.removeItem("app_active_tab");

      onDemoDataReset?.();

      setToast({
        message: `Demo data cleared: ${result.deleted.sessions} sessions, ${result.deleted.carts} carts`,
        type: "success",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset demo data";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="admin-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="admin-container">
        {/* Admin Header */}
        <header className="admin-header">
          <div className="admin-brand">
            <div className="admin-icon-pill">
              <FiShield />
            </div>
            <div>
              <span className="admin-tag font-bold">EXECUTIVE CONTROL CENTER</span>
              <h1>Supermarket Administration Dashboard</h1>
            </div>
          </div>

          <div className="admin-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <FiActivity /> Overview Stats
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "workers" ? "active" : ""}`}
              onClick={() => setActiveTab("workers")}
            >
              <FiUsers /> Worker Accounts ({workers.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "inventory" ? "active" : ""}`}
              onClick={() => setActiveTab("inventory")}
            >
              <FiShoppingBag /> Products & Stock ({products.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
              onClick={() => setActiveTab("audit")}
            >
              <FiLock /> Security Audit Logs
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="admin-loading-box">
            <FiRefreshCw className="spin-icon large" />
            <p>Loading Administrator Dashboard Metrics...</p>
          </div>
        ) : isAuthRequired ? (
          <div className="admin-auth-card">
            <div className="auth-lock-circle">
              <FiLock />
            </div>
            <h2>Admin Authorization Required</h2>
            <p>
              Security policy requires administrator credentials to access store analytics,
              worker provisioning, and inventory configuration.
            </p>
            <form onSubmit={handleAdminLogin} className="admin-auth-form">
              <div className="form-group">
                <label>Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@freshmart.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="admin-login-btn"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <FiRefreshCw className="spin-icon" /> Authenticating...
                  </>
                ) : (
                  <>
                    <FiShield /> Authenticate as Store Administrator
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="admin-content-area">
            {/* Overview Tab */}
            {activeTab === "overview" && summary && (
              <div className="overview-tab-content">
                <div className="overview-action-bar">
                  <div className="overview-action-copy">
                    <span className="overview-action-tag">Demo Maintenance</span>
                    <p>Clear prior walk-in activity and start the store from a clean state.</p>
                  </div>
                  <button
                    type="button"
                    className="danger-action-btn"
                    onClick={handleResetDemoData}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <FiRefreshCw className="spin-icon" /> Resetting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 /> Reset Demo Data
                      </>
                    )}
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card revenue font-mono">
                    <div className="stat-label">TOTAL STORE REVENUE</div>
                    <div className="stat-val">₹{summary.totalRevenue.toFixed(2)}</div>
                    <div className="stat-sub">{summary.completedOrders} Paid Orders</div>
                  </div>

                  <div className="stat-card sessions">
                    <div className="stat-label">ACTIVE SHOPPING SESSIONS</div>
                    <div className="stat-val">{summary.activeSessions}</div>
                    <div className="stat-sub">Live QR Walk-In Customers</div>
                  </div>

                  <div className="stat-card inventory">
                    <div className="stat-label">TOTAL CATALOG PRODUCTS</div>
                    <div className="stat-val">{summary.totalProducts}</div>
                    <div className="stat-sub">Across 6 Categories</div>
                  </div>

                  <div className={`stat-card stock ${summary.lowStockCount > 0 ? "alert" : ""}`}>
                    <div className="stat-label">LOW STOCK ALERTS</div>
                    <div className="stat-val">{summary.lowStockCount}</div>
                    <div className="stat-sub">Products &lt;= 5 items</div>
                  </div>
                </div>

                {/* Low Stock Warning Section */}
                {summary.lowStockProducts && summary.lowStockProducts.length > 0 && (
                  <div className="admin-card warning-box">
                    <div className="card-header-line">
                      <FiAlertTriangle className="warning-icon" />
                      <h3>Critical Low Stock Inventory Alert</h3>
                    </div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Barcode</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Remaining Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.lowStockProducts.map((p: any) => (
                          <tr key={p._id}>
                            <td><strong>{p.name}</strong></td>
                            <td>#{p.barcode}</td>
                            <td>{p.category}</td>
                            <td>₹{p.price.toFixed(2)}</td>
                            <td>
                              <span className="badge-danger">{p.stockQty} remaining</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Workers Tab */}
            {activeTab === "workers" && (
              <div className="workers-tab-content">
                <div className="admin-grid-layout">
                  {/* Worker List */}
                  <div className="admin-card">
                    <h3>Authorized Worker Accounts</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Worker Name</th>
                          <th>Email Address</th>
                          <th>Status</th>
                          <th>Created Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workers.map((w) => (
                          <tr key={w._id}>
                            <td><strong>{w.name}</strong></td>
                            <td>{w.email}</td>
                            <td>
                              <span className={`status-pill ${w.status}`}>
                                {w.status.toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                            <td>
                              <button
                                type="button"
                                className={`toggle-btn ${w.status === "active" ? "disable" : "enable"}`}
                                onClick={() => handleToggleWorker(w._id, w.status)}
                              >
                                {w.status === "active" ? <FiLock /> : <FiUnlock />}
                                {w.status === "active" ? "Disable" : "Enable"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Create Worker Form */}
                  <div className="admin-card form-card">
                    <h3><FiUserPlus /> Provision New Worker</h3>
                    <form onSubmit={handleCreateWorker} className="admin-form">
                      <div className="form-group">
                        <label>Worker Full Name</label>
                        <input
                          type="text"
                          value={newWorkerName}
                          placeholder="e.g. Ramesh Kumar"
                          onChange={(e) => setNewWorkerName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Worker Email</label>
                        <input
                          type="email"
                          value={newWorkerEmail}
                          placeholder="worker@freshmart.com"
                          onChange={(e) => setNewWorkerEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Initial Password</label>
                        <input
                          type="password"
                          value={newWorkerPassword}
                          placeholder="Initial password"
                          onChange={(e) => setNewWorkerPassword(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="admin-submit-btn">
                        <FiUserPlus /> Create Worker Account
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === "inventory" && (
              <div className="inventory-tab-content">
                <div className="admin-grid-layout">
                  {/* Product Inventory Table */}
                  <div className="admin-card">
                    <h3>Supermarket Product Catalog</h3>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Barcode</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p._id}>
                            <td>
                              <strong>{p.name}</strong>
                              <div className="sub-text">{p.unit}</div>
                            </td>
                            <td>#{p.barcode}</td>
                            <td>{p.category}</td>
                            <td>₹{p.price.toFixed(2)}</td>
                            <td>
                              <span className={p.stockQty <= 5 ? "badge-danger" : "badge-success"}>
                                {p.stockQty} in stock
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Create Product Form */}
                  <div className="admin-card form-card">
                    <h3><FiPlus /> Add New Product</h3>
                    <form onSubmit={handleCreateProduct} className="admin-form">
                      <div className="form-group">
                        <label>Barcode Number</label>
                        <input
                          type="text"
                          value={prodBarcode}
                          placeholder="e.g. 8911"
                          onChange={(e) => setProdBarcode(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Product Name</label>
                        <input
                          type="text"
                          value={prodName}
                          placeholder="e.g. Red Bull Energy Drink"
                          onChange={(e) => setProdName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                          <option value="Dairy">Dairy</option>
                          <option value="Bakery">Bakery</option>
                          <option value="Produce">Produce</option>
                          <option value="Beverages">Beverages</option>
                          <option value="Snacks">Snacks</option>
                          <option value="Pantry">Pantry</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Unit / Packaging</label>
                        <input
                          type="text"
                          value={prodUnit}
                          placeholder="e.g. 500 g / 1 Litre"
                          onChange={(e) => setProdUnit(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Price (₹ INR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={prodPrice}
                          placeholder="125.00"
                          onChange={(e) => setProdPrice(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Initial Stock Quantity</label>
                        <input
                          type="number"
                          value={prodStock}
                          placeholder="50"
                          onChange={(e) => setProdStock(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="admin-submit-btn">
                        <FiPlus /> Add Product to Catalog
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === "audit" && (
              <div className="audit-tab-content">
                <div className="admin-card">
                  <h3>System Security Audit Trail</h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td><strong>{log.actorId}</strong></td>
                          <td><span className="badge-role">{log.actorRole}</span></td>
                          <td><code>{log.action}</code></td>
                          <td>{log.targetType}</td>
                          <td>{log.details || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminDashboardPage;
