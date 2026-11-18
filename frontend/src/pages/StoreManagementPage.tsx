import { useEffect, useState, useCallback } from "react";
import {
  FiGrid,
  FiPlus,
  FiRefreshCw,
  FiMapPin,
  FiUser,
  FiToggleLeft,
  FiToggleRight,
  FiBarChart2,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import {
  getAllStores,
  createStore,
  toggleStoreActive,
  getStoreKPIs,
  assignManager,
  type StoreData,
  type StoreKPIs,
  type CreateStorePayload,
} from "../services/storeApi";
import { fetchWorkers, type WorkerData } from "../services/adminApi";
import { useAuth } from "../context/AuthContext";
import { Toast, type ToastType } from "../components/Toast";
import "./StoreManagementPage.css";

function StoreManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [stores, setStores] = useState<StoreData[]>([]);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedKPIs, setExpandedKPIs] = useState<Record<string, StoreKPIs | null>>({});
  const [form, setForm] = useState<CreateStorePayload>({
    name: "",
    address: "",
    city: "",
    gstNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Assign manager state
  const [assigningStoreId, setAssigningStoreId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const showToast = (message: string, type: ToastType) =>
    setToast({ message, type });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, workerList] = await Promise.all([
        getAllStores(),
        isAdmin ? fetchWorkers().catch(() => []) : Promise.resolve([]),
      ]);
      setStores(data);
      setWorkers(workerList);
    } catch (err) {
      showToast((err as Error).message || "Failed to load stores", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Store name is required", "error"); return; }
    setIsSaving(true);
    try {
      const created = await createStore(form);
      setStores((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setForm({ name: "", address: "", city: "", gstNumber: "" });
      showToast("Store created successfully", "success");
    } catch (err) {
      showToast((err as Error).message || "Failed to create store", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (storeId: string, current: boolean) => {
    try {
      await toggleStoreActive(storeId, !current);
      setStores((prev) =>
        prev.map((s) => (s._id === storeId ? { ...s, active: !current } : s))
      );
      showToast(`Store ${!current ? "activated" : "deactivated"}`, "success");
    } catch (err) {
      showToast((err as Error).message || "Failed to update store", "error");
    }
  };

  const handleExpandKPIs = async (storeId: string) => {
    if (expandedKPIs[storeId] !== undefined) {
      setExpandedKPIs((prev) => {
        const copy = { ...prev };
        delete copy[storeId];
        return copy;
      });
      return;
    }
    try {
      const kpis = await getStoreKPIs(storeId);
      setExpandedKPIs((prev) => ({ ...prev, [storeId]: kpis }));
    } catch {
      setExpandedKPIs((prev) => ({ ...prev, [storeId]: null }));
    }
  };

  const openAssignManager = (store: StoreData) => {
    setAssigningStoreId(store._id);
    setSelectedManagerId(store.managerId || "");
  };

  const handleAssignManager = async () => {
    if (!assigningStoreId || !selectedManagerId) {
      showToast("Please select a worker to assign as manager", "error");
      return;
    }
    setIsAssigning(true);
    try {
      const updated = await assignManager(assigningStoreId, selectedManagerId);
      setStores((prev) => prev.map((s) => (s._id === assigningStoreId ? updated : s)));
      const mgrName = workers.find((w) => w._id === selectedManagerId)?.name || "Manager";
      showToast(`${mgrName} assigned as store manager`, "success");
      setAssigningStoreId(null);
      setSelectedManagerId("");
    } catch (err) {
      showToast((err as Error).message || "Failed to assign manager", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="store-loading">
        <FiRefreshCw className="store-spin" size={32} />
        <p>Loading stores…</p>
      </div>
    );
  }

  return (
    <div className="store-root">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="store-header">
        <div className="store-header-left">
          <FiGrid size={24} />
          <div>
            <h1>Store Management</h1>
            <p>{stores.length} store{stores.length !== 1 ? "s" : ""} registered</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="store-refresh-btn" onClick={load}>
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button className="store-add-btn" onClick={() => setShowCreateForm((v) => !v)}>
            <FiPlus size={14} /> {showCreateForm ? "Cancel" : "Add Store"}
          </button>
        </div>
      </div>

      {/* Create Store Form */}
      {showCreateForm && (
        <form className="store-create-form" onSubmit={handleCreate}>
          <h2>New Store</h2>
          <div className="store-form-grid">
            <div className="store-form-field">
              <label>Store Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Fresh Mart Downtown"
                required
              />
            </div>
            <div className="store-form-field">
              <label>City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Chennai"
              />
            </div>
            <div className="store-form-field store-form-full">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123, Anna Salai, T Nagar"
              />
            </div>
            <div className="store-form-field">
              <label>GST Number</label>
              <input
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                placeholder="33AABCU9603R1ZX"
              />
            </div>
          </div>
          <button className="store-save-btn" type="submit" disabled={isSaving}>
            {isSaving ? "Creating…" : "Create Store"}
          </button>
        </form>
      )}

      {/* Store Cards */}
      <div className="store-grid">
        {stores.map((store) => {
          const kpis = expandedKPIs[store._id];
          return (
            <div key={store._id} className={`store-card ${store.active ? "" : "store-card-inactive"}`}>
              <div className="store-card-header">
                <div className="store-card-title">
                  <span className={`store-dot ${store.active ? "store-dot-on" : "store-dot-off"}`} />
                  <h3>{store.name}</h3>
                </div>
                <div className="store-card-actions">
                  <button
                    className="store-kpi-btn"
                    onClick={() => handleExpandKPIs(store._id)}
                    title="View KPIs"
                  >
                    <FiBarChart2 size={14} />
                    {kpis !== undefined ? " Hide" : " KPIs"}
                  </button>
                  <button
                    className="store-toggle-btn"
                    onClick={() => handleToggle(store._id, store.active)}
                    title={store.active ? "Deactivate" : "Activate"}
                  >
                    {store.active ? <FiToggleRight size={18} color="#10b981" /> : <FiToggleLeft size={18} color="#64748b" />}
                  </button>
                </div>
              </div>

              <div className="store-card-meta">
                {store.city && (
                  <span className="store-meta-item"><FiMapPin size={12} /> {store.city}</span>
                )}
                {store.address && (
                  <span className="store-meta-item store-meta-address">{store.address}</span>
                )}
                {store.gstNumber && (
                  <span className="store-meta-item store-meta-gst">GST: {store.gstNumber}</span>
                )}
                {store.managerName && (
                  <span className="store-meta-item"><FiUser size={12} /> {store.managerName}</span>
                )}
              </div>

              {/* Assign Manager (admin only) */}
              {isAdmin && (
                <div className="store-assign-section">
                  {assigningStoreId === store._id ? (
                    <div className="store-assign-dropdown">
                      <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="store-manager-select"
                      >
                        <option value="">Select a worker…</option>
                        {workers
                          .filter((w) => w.status === "active")
                          .map((w) => (
                            <option key={w._id} value={w._id}>
                              {w.name} ({w.email})
                            </option>
                          ))}
                      </select>
                      <div className="store-assign-actions">
                        <button
                          className="store-assign-confirm"
                          onClick={handleAssignManager}
                          disabled={isAssigning || !selectedManagerId}
                        >
                          {isAssigning ? "Assigning…" : "Confirm"}
                        </button>
                        <button
                          className="store-assign-cancel"
                          onClick={() => { setAssigningStoreId(null); setSelectedManagerId(""); }}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="store-assign-btn"
                      onClick={() => openAssignManager(store)}
                    >
                      <FiUserCheck size={14} />
                      {store.managerName ? "Change Manager" : "Assign Manager"}
                    </button>
                  )}
                </div>
              )}

              {kpis !== undefined && (
                <div className="store-kpi-panel">
                  {kpis === null ? (
                    <span className="store-kpi-error">Failed to load KPIs</span>
                  ) : (
                    <div className="store-kpi-grid">
                      <div className="store-kpi-tile">
                        <span className="store-kpi-val">₹{kpis.todayRevenue.toFixed(2)}</span>
                        <span className="store-kpi-label">Today's Revenue</span>
                      </div>
                      <div className="store-kpi-tile">
                        <span className="store-kpi-val">{kpis.totalOrders}</span>
                        <span className="store-kpi-label">Total Orders</span>
                      </div>
                      <div className="store-kpi-tile">
                        <span className="store-kpi-val">{kpis.activeSessionCount}</span>
                        <span className="store-kpi-label">Active Sessions</span>
                      </div>
                      <div className="store-kpi-tile">
                        <span className="store-kpi-val" style={{ color: kpis.lowStockCount > 0 ? "#f59e0b" : "#10b981" }}>
                          {kpis.lowStockCount}
                        </span>
                        <span className="store-kpi-label">Low Stock</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StoreManagementPage;
