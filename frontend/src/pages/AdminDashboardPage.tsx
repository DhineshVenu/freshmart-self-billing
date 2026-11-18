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
  FiEdit2,
  FiSave,
  FiX,
  FiAward,
} from "react-icons/fi";
import {
  fetchAdminDashboard,
  fetchWorkers,
  createWorker,
  toggleWorkerStatus,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  fetchCustomers,
  updateCustomerPointsAdmin,
  resetDemoData,
  type DashboardSummary,
  type WorkerData,
  type CustomerData,
  type AuditLogData,
} from "../services/adminApi";
import { getProducts } from "../services/cartApi";
import type { ProductData } from "../types/cart";
import { loginUser } from "../services/authApi";
import { Toast, type ToastType } from "../components/Toast";
import { BarcodeLabel } from "../components/BarcodeLabel";
import "./AdminDashboardPage.css";

interface AdminDashboardPageProps {
  onDemoDataReset?: () => void;
}

function AdminDashboardPage({ onDemoDataReset }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "workers" | "inventory" | "loyalty" | "audit">("overview");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
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

  // Add Product modal state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Edit product modal state
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editName, setEditName]         = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit]         = useState("");
  const [editPrice, setEditPrice]       = useState("");
  const [editStock, setEditStock]       = useState("");
  const [editActive, setEditActive]     = useState(true);
  const [isSaving, setIsSaving]         = useState(false);

  // Edit Customer Points modal state
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [pointsInput, setPointsInput]         = useState<number>(0);
  const [walletInput, setWalletInput]         = useState<number>(0);
  const [pointsReason, setPointsReason]       = useState<string>("");
  const [isSavingPoints, setIsSavingPoints]   = useState<boolean>(false);

  // Extended edit fields (nutrition, wayfinding, clearance)
  const [editAisle, setEditAisle]               = useState("");
  const [editShelf, setEditShelf]               = useState("");
  const [editBay, setEditBay]                   = useState("");
  const [editNutriScore, setEditNutriScore]     = useState<"A"|"B"|"C"|"D"|"E">("B");
  const [editAllergens, setEditAllergens]        = useState("");
  const [editDietaryFlags, setEditDietaryFlags] = useState("");
  const [editCalories, setEditCalories]         = useState("");
  const [editExpiryDate, setEditExpiryDate]     = useState("");
  const [editClearance, setEditClearance]       = useState("");

  // Extended create fields
  const [prodAisle, setProdAisle]               = useState("");
  const [prodShelf, setProdShelf]               = useState("");
  const [prodBay, setProdBay]                   = useState("");
  const [prodNutriScore, setProdNutriScore]     = useState<"A"|"B"|"C"|"D"|"E">("B");
  const [prodAllergens, setProdAllergens]        = useState("");
  const [prodDietaryFlags, setProdDietaryFlags] = useState("");
  const [prodCalories, setProdCalories]         = useState("");
  const [prodExpiryDate, setProdExpiryDate]     = useState("");
  const [prodClearance, setProdClearance]       = useState("");

  const [isAuthRequired, setIsAuthRequired] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("admin@freshmart.com");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setIsAuthRequired(false);
      const [dashData, workerList, productList, customerList] = await Promise.all([
        fetchAdminDashboard(),
        fetchWorkers(),
        getProducts("All"),
        fetchCustomers(),
      ]);
      setSummary(dashData.summary);
      setAuditLogs(dashData.recentAuditLogs);
      setWorkers(workerList);
      setProducts(productList);
      setCustomers(customerList);
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
        // Extended fields
        aisle: prodAisle || undefined,
        shelf: prodShelf || undefined,
        bay: prodBay ? parseInt(prodBay, 10) : undefined,
        nutriScore: prodNutriScore,
        allergens: prodAllergens ? prodAllergens.split(",").map((s) => s.trim()).filter(Boolean) : [],
        dietaryFlags: prodDietaryFlags ? prodDietaryFlags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        calories: prodCalories ? parseInt(prodCalories, 10) : undefined,
        expiryDate: prodExpiryDate || undefined,
        clearanceDiscountPercent: prodClearance ? Number(prodClearance) : 0,
      });

      setToast({ message: `Product '${prodName}' added to inventory ✓`, type: "success" });
      setProdBarcode("");
      setProdName("");
      setProdPrice("");
      setProdStock("");
      setProdAisle(""); setProdShelf(""); setProdBay("");
      setProdAllergens(""); setProdDietaryFlags("");
      setProdCalories(""); setProdExpiryDate(""); setProdClearance("");
      setIsAddProductModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product";
      setToast({ message: msg, type: "error" });
    }
  };

  const openCustomerPointsModal = (c: CustomerData) => {
    setEditingCustomer(c);
    const pts = c.bountyPoints || 0;
    const wallet =
      c.bountyWalletBalance !== undefined
        ? c.bountyWalletBalance
        : Number((pts * 0.5).toFixed(2));
    setPointsInput(pts);
    setWalletInput(wallet);
    setPointsReason("");
  };

  const handlePointsChange = (newPts: number) => {
    const validPts = Math.max(0, Math.floor(newPts));
    setPointsInput(validPts);
    setWalletInput(Number((validPts * 0.5).toFixed(2)));
  };

  const handleSaveCustomerPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setIsSavingPoints(true);
      const updated = await updateCustomerPointsAdmin(
        editingCustomer._id,
        pointsInput,
        walletInput,
        pointsReason.trim() || undefined
      );

      setToast({
        message: `Fresh Points updated for ${updated.name || updated.email}: ${updated.bountyPoints} pts (₹${updated.bountyWalletBalance?.toFixed(2)}) ✓`,
        type: "success",
      });
      setEditingCustomer(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update customer points";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsSavingPoints(false);
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

  const openEditModal = (p: ProductData) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditUnit(p.unit || "");
    setEditPrice(String(p.price));
    setEditStock(String(p.stockQty));
    setEditActive(p.active);
    // Extended fields
    setEditAisle(p.aisle || "");
    setEditShelf(p.shelf || "");
    setEditBay(p.bay != null ? String(p.bay) : "");
    setEditNutriScore(p.nutriScore || "B");
    setEditAllergens((p.allergens || []).join(", "));
    setEditDietaryFlags((p.dietaryFlags || []).join(", "));
    setEditCalories(p.calories != null ? String(p.calories) : "");
    setEditExpiryDate(
      p.expiryDate
        ? new Date(p.expiryDate).toISOString().split("T")[0]
        : ""
    );
    setEditClearance(p.clearanceDiscountPercent ? String(p.clearanceDiscountPercent) : "");
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || !editPrice) {
      setToast({ message: "Name and price are required.", type: "error" });
      return;
    }
    setIsSaving(true);
    try {
      await updateProductAdmin(editingProduct._id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim(),
        price: parseFloat(editPrice),
        stockQty: parseInt(editStock, 10),
        active: editActive,
        // Extended fields
        aisle: editAisle || undefined,
        shelf: editShelf || undefined,
        bay: editBay ? parseInt(editBay, 10) : undefined,
        nutriScore: editNutriScore,
        allergens: editAllergens ? editAllergens.split(",").map((s) => s.trim()).filter(Boolean) : [],
        dietaryFlags: editDietaryFlags ? editDietaryFlags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        calories: editCalories ? parseInt(editCalories, 10) : undefined,
        expiryDate: editExpiryDate || undefined,
        clearanceDiscountPercent: editClearance ? Number(editClearance) : 0,
      });
      setToast({ message: `'${editName}' updated successfully ✓`, type: "success" });
      setEditingProduct(null);
      loadData();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Update failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (p: ProductData) => {
    if (!window.confirm(`Deactivate "${p.name}"? It will be hidden from the catalog.`)) return;
    try {
      await deleteProductAdmin(p._id);
      setToast({ message: `'${p.name}' deactivated ✓`, type: "info" });
      loadData();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Delete failed", type: "error" });
    }
  };

  return (
    <main className="admin-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Edit Product Modal ───────────────────────────── */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="edit-product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiEdit2 /> Edit Product</h2>
              <button type="button" className="modal-close-btn" onClick={() => setEditingProduct(null)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-form">
              {/* Barcode (read-only) */}
              <div className="form-group">
                <label>Barcode (read-only)</label>
                <div className="barcode-readonly">
                  <BarcodeLabel value={editingProduct.barcode} width={1.8} height={45} fontSize={12} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Product name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    {["Dairy","Bakery","Produce","Beverages","Snacks","Pantry","General"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Unit / Packaging</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="e.g. 500 g"
                  />
                </div>
                <div className="form-group">
                  <label>Price (₹ INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editActive ? "active" : "inactive"}
                    onChange={(e) => setEditActive(e.target.value === "active")}
                  >
                    <option value="active">Active (visible in catalog)</option>
                    <option value="inactive">Inactive (hidden)</option>
                  </select>
                </div>
              </div>

              {/* ── Extended fields: Nutrition & Wayfinding ── */}
              <div className="form-section-divider">
                <span>Nutrition & Wayfinding</span>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Nutri-Score</label>
                  <select value={editNutriScore} onChange={(e) => setEditNutriScore(e.target.value as "A"|"B"|"C"|"D"|"E")}>
                    <option value="A">A (Healthiest)</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E (Least healthy)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Calories (per serving)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    placeholder="e.g. 180"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Allergens (comma-separated)</label>
                <input
                  type="text"
                  value={editAllergens}
                  onChange={(e) => setEditAllergens(e.target.value)}
                  placeholder="e.g. Gluten, Milk, Nuts"
                />
              </div>

              <div className="form-group">
                <label>Dietary Flags (comma-separated)</label>
                <input
                  type="text"
                  value={editDietaryFlags}
                  onChange={(e) => setEditDietaryFlags(e.target.value)}
                  placeholder="e.g. Vegetarian, Vegan"
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Aisle</label>
                  <input
                    type="text"
                    value={editAisle}
                    onChange={(e) => setEditAisle(e.target.value)}
                    placeholder="e.g. Aisle 2"
                  />
                </div>
                <div className="form-group">
                  <label>Shelf</label>
                  <input
                    type="text"
                    value={editShelf}
                    onChange={(e) => setEditShelf(e.target.value)}
                    placeholder="e.g. Shelf B"
                  />
                </div>
                <div className="form-group">
                  <label>Bay</label>
                  <input
                    type="number"
                    min="0"
                    value={editBay}
                    onChange={(e) => setEditBay(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>

              {/* ── Extended fields: Clearance & Expiry ── */}
              <div className="form-section-divider">
                <span>Clearance & Expiry</span>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Clearance Discount % (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editClearance}
                    onChange={(e) => setEditClearance(e.target.value)}
                    placeholder="e.g. 15"
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? <FiRefreshCw className="spin-icon" /> : <FiSave />}
                  {isSaving ? " Saving…" : " Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add New Product Modal ── */}
      {isAddProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddProductModalOpen(false)}>
          <div
            className="edit-product-modal admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-modal-title"
          >
            <div className="modal-header">
              <h2 id="add-product-modal-title">
                <FiPlus /> Add New Supermarket Product
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddProductModalOpen(false)}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="admin-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Barcode Number *</label>
                  <input
                    type="text"
                    required
                    value={prodBarcode}
                    placeholder="e.g. 8901030001"
                    onChange={(e) => setProdBarcode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    placeholder="e.g. Red Bull Energy Drink 250ml"
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
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
                    placeholder="e.g. 250 ml / 500 g / 1 pc"
                    onChange={(e) => setProdUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Unit Price (₹ INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
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
              </div>

              <div className="form-section-divider">
                <span>Nutrition & Wayfinding</span>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Nutri-Score</label>
                  <select value={prodNutriScore} onChange={(e) => setProdNutriScore(e.target.value as "A"|"B"|"C"|"D"|"E")}>
                    <option value="A">A (Healthiest)</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E (Least healthy)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Calories (per serving)</label>
                  <input
                    type="number"
                    min="0"
                    value={prodCalories}
                    placeholder="e.g. 180"
                    onChange={(e) => setProdCalories(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Allergens (comma-separated)</label>
                <input
                  type="text"
                  value={prodAllergens}
                  placeholder="e.g. Milk, Nuts, Gluten"
                  onChange={(e) => setProdAllergens(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Dietary Flags (comma-separated)</label>
                <input
                  type="text"
                  value={prodDietaryFlags}
                  placeholder="e.g. Vegetarian, Vegan, High-Energy"
                  onChange={(e) => setProdDietaryFlags(e.target.value)}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>Aisle</label>
                  <input
                    type="text"
                    value={prodAisle}
                    placeholder="Aisle 1"
                    onChange={(e) => setProdAisle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Shelf</label>
                  <input
                    type="text"
                    value={prodShelf}
                    placeholder="Shelf A"
                    onChange={(e) => setProdShelf(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Bay</label>
                  <input
                    type="number"
                    min="0"
                    value={prodBay}
                    placeholder="1"
                    onChange={(e) => setProdBay(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-section-divider">
                <span>Clearance & Expiry</span>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={prodExpiryDate}
                    onChange={(e) => setProdExpiryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Clearance Discount % (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={prodClearance}
                    placeholder="0"
                    onChange={(e) => setProdClearance(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  <FiPlus /> Add Product to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Adjust Customer Fresh Points Modal ── */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => setEditingCustomer(null)}>
          <div
            className="edit-product-modal admin-modal-card points-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-points-modal-title"
          >
            <div className="modal-header">
              <h2 id="customer-points-modal-title">
                <FiAward /> Adjust Fresh Points & Wallet Balance
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingCustomer(null)}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerPoints} className="admin-form">
              <div className="customer-info-box">
                <div className="info-row">
                  <span className="info-label">Customer Account:</span>
                  <strong className="info-value">{editingCustomer.name || "Customer"}</strong>
                </div>
                <div className="info-row">
                  <span className="info-label">Registered Email:</span>
                  <span className="info-value font-mono">{editingCustomer.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Current Fresh Points:</span>
                  <span className="info-value">
                    <span className="points-pill-sm"><FiAward /> {editingCustomer.bountyPoints || 0} pts</span>
                    {" ➔ "}
                    <strong style={{ color: "#34d399" }}>
                      ₹{(editingCustomer.bountyWalletBalance !== undefined ? editingCustomer.bountyWalletBalance : (editingCustomer.bountyPoints || 0) * 0.5).toFixed(2)} wallet credit
                    </strong>
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Fresh Points (Loyalty Bounty Points)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={pointsInput}
                  onChange={(e) => handlePointsChange(Number(e.target.value))}
                />
                <span className="helper-hint">
                  Fresh Points are earned via verified shelf reporting and shopping loyalty.
                </span>
              </div>

              {/* Quick increment buttons */}
              <div className="quick-points-bar">
                <span className="quick-label">Quick Bump:</span>
                <button
                  type="button"
                  className="btn-quick-chip"
                  onClick={() => handlePointsChange(pointsInput + 25)}
                >
                  +25 pts
                </button>
                <button
                  type="button"
                  className="btn-quick-chip"
                  onClick={() => handlePointsChange(pointsInput + 50)}
                >
                  +50 pts
                </button>
                <button
                  type="button"
                  className="btn-quick-chip"
                  onClick={() => handlePointsChange(pointsInput + 100)}
                >
                  +100 pts
                </button>
                <button
                  type="button"
                  className="btn-quick-chip"
                  onClick={() => handlePointsChange(pointsInput + 500)}
                >
                  +500 pts
                </button>
                <button
                  type="button"
                  className="btn-quick-chip chip-reset"
                  onClick={() => handlePointsChange(0)}
                >
                  Reset 0
                </button>
              </div>

              <div className="form-group">
                <label>Redeemable Wallet Credit (₹ INR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={walletInput}
                  onChange={(e) => setWalletInput(Math.max(0, parseFloat(e.target.value) || 0))}
                />
                <span className="helper-hint">
                  Standard conversion: 1 pt = ₹0.50 in-store credit. You can also customize this balance directly.
                </span>
              </div>

              <div className="form-group">
                <label>Adjustment Reason / Audit Trail Note</label>
                <input
                  type="text"
                  placeholder="e.g. Loyalty milestone reward, Customer service goodwill, Shelf audit bounty..."
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingCustomer(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={isSavingPoints}>
                  {isSavingPoints ? <FiRefreshCw className="spin-icon" /> : <FiSave />}
                  {isSavingPoints ? " Saving…" : " Save Points & Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              className={`tab-btn ${activeTab === "loyalty" ? "active" : ""}`}
              onClick={() => setActiveTab("loyalty")}
            >
              <FiAward /> Fresh Points & Loyalty ({customers.length})
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
                    <div className="table-wrapper" tabIndex={0} role="region" aria-label="Authorized Worker Accounts">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Worker Name</th>
                            <th>Email Address</th>
                            <th className="col-center">Status</th>
                            <th className="col-center">Created Date</th>
                            <th className="col-action">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workers.map((w) => (
                            <tr key={w._id}>
                              <td><strong>{w.name}</strong></td>
                              <td><span className="text-muted font-mono">{w.email}</span></td>
                              <td className="col-center">
                                <span className={`status-pill ${w.status}`}>
                                  {w.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="col-center">{new Date(w.createdAt).toLocaleDateString()}</td>
                              <td className="col-action">
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
                <div className="admin-card product-catalog-card">
                  <div className="admin-card-header">
                    <div className="admin-card-header-info">
                      <h3><FiShoppingBag /> Supermarket Product Catalog ({products.length})</h3>
                      <p className="admin-card-header-sub">
                        Full-width inventory catalog with Aisle/Shelf locations, Nutri-Scores, price tags, and direct controls.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-create-modal-trigger"
                      onClick={() => setIsAddProductModalOpen(true)}
                    >
                      <FiPlus /> Add New Product
                    </button>
                  </div>

                  <div className="table-wrapper" tabIndex={0} role="region" aria-label="Supermarket Product Catalog">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product & Unit</th>
                          <th>Barcode</th>
                          <th>Category</th>
                          <th>Aisle Location</th>
                          <th className="col-center">Nutri-Score</th>
                          <th className="col-price">Unit Price</th>
                          <th className="col-qty">Inventory</th>
                          <th className="col-action">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p._id}>
                            <td>
                              <strong>{p.name}</strong>
                              <div className="sub-text">{p.unit || "Standard pack"}</div>
                              {p.clearanceDiscountPercent && p.clearanceDiscountPercent > 0 ? (
                                <span className="badge-clearance">⚡ CLEARANCE {p.clearanceDiscountPercent}% OFF</span>
                              ) : null}
                            </td>
                            <td>
                              <BarcodeLabel
                                value={p.barcode}
                                width={1.3}
                                height={32}
                                fontSize={10}
                              />
                            </td>
                            <td>
                              <span className="category-pill">{p.category}</span>
                            </td>
                            <td>
                              {p.aisle ? (
                                <span className="aisle-badge" title={`${p.aisle} / ${p.shelf || ""}`}>
                                  {p.aisle}
                                </span>
                              ) : (
                                <span className="sub-text">—</span>
                              )}
                            </td>
                            <td className="col-center">
                              {p.nutriScore ? (
                                <span className={`nutri-pill nutri-${p.nutriScore.toLowerCase()}`}>
                                  {p.nutriScore}
                                </span>
                              ) : (
                                <span className="sub-text">—</span>
                              )}
                            </td>
                            <td className="col-price font-mono">₹{p.price.toFixed(2)}</td>
                            <td className="col-qty">
                              <span className={p.stockQty <= 5 ? "badge-danger" : "badge-success"}>
                                {p.stockQty} in stock
                              </span>
                            </td>
                            <td className="col-action">
                              <div className="row-action-group">
                                <button
                                  type="button"
                                  className="btn-row-edit"
                                  onClick={() => openEditModal(p)}
                                  title="Edit product"
                                >
                                  <FiEdit2 /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-row-delete"
                                  onClick={() => handleDeleteProduct(p)}
                                  title="Deactivate product"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Loyalty & Fresh Points Tab */}
            {activeTab === "loyalty" && (
              <div className="loyalty-tab-content">
                {/* Stats summary row */}
                <div className="loyalty-stats-grid">
                  <div className="loyalty-stat-card">
                    <span className="stat-label">REGISTERED CUSTOMERS</span>
                    <span className="stat-value">{customers.length}</span>
                    <span className="stat-meta">Active shoppers enrolled</span>
                  </div>
                  <div className="loyalty-stat-card">
                    <span className="stat-label">FRESH POINTS CIRCULATION</span>
                    <span className="stat-value pts-glow">
                      {customers.reduce((acc, c) => acc + (c.bountyPoints || 0), 0)} pts
                    </span>
                    <span className="stat-meta">Earned via shelf reporting & shopping</span>
                  </div>
                  <div className="loyalty-stat-card">
                    <span className="stat-label">REDEEMABLE WALLET CREDIT</span>
                    <span className="stat-value wallet-glow">
                      ₹{customers.reduce((acc, c) => acc + (c.bountyWalletBalance !== undefined ? c.bountyWalletBalance : (c.bountyPoints || 0) * 0.5), 0).toFixed(2)}
                    </span>
                    <span className="stat-meta">1 Fresh Point = ₹0.50 wallet credit</span>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <div className="admin-card-header-info">
                      <h3><FiAward /> Customer Loyalty & Fresh Points Management</h3>
                      <p className="admin-card-header-sub">
                        Review customer loyalty accounts, adjust Fresh Points, credit wallet balances, or award shelf-reporting bonuses.
                      </p>
                    </div>
                  </div>

                  <div className="table-wrapper" tabIndex={0} role="region" aria-label="Customer Loyalty Points Table">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Phone</th>
                          <th className="col-center">Fresh Points</th>
                          <th className="col-price">Wallet Balance</th>
                          <th className="col-center">Conversion Value</th>
                          <th className="col-center">Status</th>
                          <th>Member Since</th>
                          <th className="col-action">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                              No registered customer accounts found.
                            </td>
                          </tr>
                        ) : (
                          customers.map((c) => {
                            const pts = c.bountyPoints || 0;
                            const wallet = c.bountyWalletBalance !== undefined ? c.bountyWalletBalance : pts * 0.5;
                            return (
                              <tr key={c._id}>
                                <td>
                                  <strong>{c.name || "Valued Shopper"}</strong>
                                  <div className="sub-text">{c.email}</div>
                                </td>
                                <td>{c.phone || <span className="sub-text">—</span>}</td>
                                <td className="col-center">
                                  <span className="points-pill">
                                    <FiAward /> {pts} pts
                                  </span>
                                </td>
                                <td className="col-price font-mono font-bold" style={{ color: "#34d399" }}>
                                  ₹{wallet.toFixed(2)}
                                </td>
                                <td className="col-center">
                                  <span className="sub-text">1 pt = ₹0.50</span>
                                </td>
                                <td className="col-center">
                                  <span className={`status-pill ${c.status || "active"}`}>
                                    {c.status || "active"}
                                  </span>
                                </td>
                                <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                                <td className="col-action">
                                  <button
                                    type="button"
                                    className="btn-row-edit"
                                    onClick={() => openCustomerPointsModal(c)}
                                    title="Adjust Fresh Points and wallet credit"
                                  >
                                    <FiEdit2 /> Edit Points
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
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
