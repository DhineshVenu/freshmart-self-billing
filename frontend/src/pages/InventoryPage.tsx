import { useEffect, useState, useCallback } from "react";
import {
  FiPackage,
  FiAlertTriangle,
  FiRefreshCw,
  FiEdit2,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  getInventoryAlerts,
  getStockReport,
  setReorderThreshold,
  acknowledgeAlert,
  type InventoryAlertData,
  type StockReportItem,
} from "../services/inventoryApi";
import { Toast, type ToastType } from "../components/Toast";
import "./InventoryPage.css";

type StockStatus = "OK" | "LOW" | "OUT";

function stockStatus(qty: number, reorder: number): StockStatus {
  if (qty === 0) return "OUT";
  if (qty <= reorder) return "LOW";
  return "OK";
}

const STATUS_COLORS: Record<StockStatus, string> = {
  OK: "#10b981",
  LOW: "#f59e0b",
  OUT: "#ef4444",
};

function InventoryPage() {
  const [alerts, setAlerts] = useState<InventoryAlertData[]>([]);
  const [report, setReport] = useState<StockReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "qty" | "status">("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) =>
    setToast({ message, type });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [alertsRes, reportRes] = await Promise.all([
        getInventoryAlerts(),
        getStockReport(),
      ]);
      setAlerts(alertsRes);
      setReport(reportRes);
    } catch (err) {
      showToast((err as Error).message || "Failed to load inventory data", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      showToast("Alert acknowledged", "success");
    } catch (err) {
      showToast((err as Error).message || "Failed to acknowledge alert", "error");
    }
  };

  const handleSaveThreshold = async (productId: string) => {
    const level = parseInt(editValue, 10);
    if (isNaN(level) || level < 0) {
      showToast("Enter a valid non-negative number", "error");
      return;
    }
    try {
      await setReorderThreshold(productId, level);
      setReport((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, reorderLevel: level } : item
        )
      );
      setEditingId(null);
      showToast("Reorder threshold updated", "success");
    } catch (err) {
      showToast((err as Error).message || "Failed to update threshold", "error");
    }
  };

  const sorted = [...report].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "qty") cmp = a.stockQty - b.stockQty;
    else {
      const rank: Record<StockStatus, number> = { OUT: 0, LOW: 1, OK: 2 };
      cmp = rank[stockStatus(a.stockQty, a.reorderLevel)] - rank[stockStatus(b.stockQty, b.reorderLevel)];
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (
      sortDir === "asc" ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />
    ) : null;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };

  if (isLoading) {
    return (
      <div className="inv-loading">
        <FiRefreshCw className="inv-spin" size={32} />
        <p>Loading inventory…</p>
      </div>
    );
  }

  return (
    <div className="inv-root">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="inv-header">
        <div className="inv-header-left">
          <FiPackage size={24} />
          <div>
            <h1>Inventory Management</h1>
            <p>{report.length} products · {alerts.length} active alerts</p>
          </div>
        </div>
        <button className="inv-refresh-btn" onClick={load}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Active Alerts Panel */}
      {alerts.length > 0 && (
        <section className="inv-alerts-section">
          <h2><FiAlertTriangle color="#f59e0b" /> Low-Stock Alerts</h2>
          <div className="inv-alerts-grid">
            {alerts.map((alert) => (
              <div key={alert._id} className="inv-alert-card">
                <div className="inv-alert-info">
                  <span className="inv-alert-name">{alert.productName}</span>
                  <span className="inv-alert-detail">
                    Stock: <strong style={{ color: "#ef4444" }}>{alert.currentQty}</strong>
                    {" "}· Reorder level: {alert.reorderLevel}
                  </span>
                  {alert.lastAlertedAt && (
                    <span className="inv-alert-time">
                      Alerted: {new Date(alert.lastAlertedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  className="inv-ack-btn"
                  onClick={() => handleAcknowledge(alert._id)}
                >
                  <FiCheck size={13} /> Acknowledge
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stock Report Table */}
      <section className="inv-table-section">
        <h2>Stock Report</h2>
        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>
                  Product <SortIcon col="name" />
                </th>
                <th>Barcode</th>
                <th>Category</th>
                <th onClick={() => toggleSort("qty")} style={{ cursor: "pointer" }}>
                  Stock Qty <SortIcon col="qty" />
                </th>
                <th>Reorder Level</th>
                <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>
                  Status <SortIcon col="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const status = stockStatus(item.stockQty, item.reorderLevel);
                const isEditing = editingId === item.productId;
                return (
                  <tr key={item.productId} className={`inv-row inv-row-${status.toLowerCase()}`}>
                    <td className="inv-cell-name">{item.name}</td>
                    <td className="inv-cell-mono">{item.barcode}</td>
                    <td>{item.category}</td>
                    <td className="inv-cell-qty">
                      <span style={{ color: STATUS_COLORS[status], fontWeight: 700 }}>
                        {item.stockQty}
                      </span>
                    </td>
                    <td className="inv-cell-threshold">
                      {isEditing ? (
                        <div className="inv-edit-row">
                          <input
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="inv-edit-input"
                            autoFocus
                          />
                          <button
                            className="inv-icon-btn inv-save"
                            onClick={() => handleSaveThreshold(item.productId)}
                          >
                            <FiCheck size={13} />
                          </button>
                          <button
                            className="inv-icon-btn inv-cancel"
                            onClick={() => setEditingId(null)}
                          >
                            <FiX size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="inv-edit-row">
                          <span>{item.reorderLevel}</span>
                          <button
                            className="inv-icon-btn inv-edit"
                            onClick={() => {
                              setEditingId(item.productId);
                              setEditValue(String(item.reorderLevel));
                            }}
                          >
                            <FiEdit2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="inv-badge"
                        style={{ background: STATUS_COLORS[status] }}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default InventoryPage;
