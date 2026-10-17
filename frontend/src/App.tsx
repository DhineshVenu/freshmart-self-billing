import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  FiShield,
  FiUserCheck,
  FiShoppingCart,
  FiSliders,
  FiFileText,
  FiPackage,
  FiBarChart2,
  FiGrid,
} from "react-icons/fi";
import JoinSessionPage from "./pages/JoinSessionPage";
import ShoppingPage from "./pages/ShoppingPage";
import WorkerDashboardPage from "./pages/WorkerDashboardPage";
import CustomerHistoryPage from "./pages/CustomerHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import InventoryPage from "./pages/InventoryPage";
import StoreManagementPage from "./pages/StoreManagementPage";
import ReportsPage from "./pages/ReportsPage";
import type { ShoppingSessionData } from "./types/session";

// ─── Shared session helpers (sessionStorage) ────────────────────────────────

const getStoredSession = (): ShoppingSessionData | null => {
  try {
    const raw = sessionStorage.getItem("app_active_session");
    return raw ? (JSON.parse(raw) as ShoppingSessionData) : null;
  } catch {
    return null;
  }
};

const storeSession = (session: ShoppingSessionData) => {
  sessionStorage.setItem("app_active_session", JSON.stringify(session));
  sessionStorage.setItem("app_session_code", session.id);
};

const clearSession = () => {
  sessionStorage.removeItem("app_active_session");
  sessionStorage.removeItem("app_session_code");
};

// ─── Navigation Bar ──────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionCode = sessionStorage.getItem("app_session_code") || "";

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navBtn = (
    path: string,
    label: string,
    Icon: React.ElementType,
    color: string
  ) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "8px",
        border: isActive(path) ? `1px solid ${color}` : "1px solid #334155",
        background: isActive(path) ? color : "#1e293b",
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <Icon /> <span>{label}</span>
    </button>
  );

  return (
    <nav
      style={{
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#ffffff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            background: "#047857",
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            fontSize: "16px",
          }}
        >
          <FiShoppingCart />
        </div>
        <div
          style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "0.04em" }}
        >
          FRESH MART SELF-BILLING
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {navBtn("/worker", "Worker Terminal", FiShield, "#047857")}
        {navBtn("/join", "Customer Check-In", FiUserCheck, "#0284c7")}
        {sessionCode &&
          navBtn("/shop", "Active Cart & Scanner", FiShoppingCart, "#10b981")}
        {navBtn("/history", "My Bills & Receipts", FiFileText, "#06b6d4")}
        {navBtn("/admin", "Admin Console", FiSliders, "#8b5cf6")}
        {navBtn("/inventory", "Inventory", FiPackage, "#f59e0b")}
        {navBtn("/stores", "Stores", FiGrid, "#ec4899")}
        {navBtn("/reports", "Reports", FiBarChart2, "#14b8a6")}
      </div>
    </nav>
  );
}

// ─── Route wrapper components ─────────────────────────────────────────────────

/** /worker */
function WorkerRoute() {
  const navigate = useNavigate();
  return (
    <WorkerDashboardPage
      onNavigateToJoin={(code) => navigate(`/join/${code}`)}
    />
  );
}

/** /join and /join/:code */
function JoinRoute() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  return (
    <JoinSessionPage
      sessionCode={code ?? ""}
      onBackToWorker={() => navigate("/worker")}
      onStartShopping={(session) => {
        storeSession(session);
        navigate("/shop");
      }}
      onSelectSessionCode={(newCode) => navigate(`/join/${newCode}`)}
    />
  );
}

/** /shop */
function ShopRoute() {
  const navigate = useNavigate();
  const session = getStoredSession();

  if (!session) {
    return <Navigate to="/join" replace />;
  }

  return (
    <ShoppingPage
      sessionCode={session.id}
      customerName={session.joinedCustomerName || "Customer"}
      storeName={session.storeName || "Fresh Mart"}
      onLeaveSession={() => {
        clearSession();
        navigate("/worker");
      }}
      onSessionComplete={() => {
        clearSession();
        navigate("/history");
      }}
      onNavigateToHistory={() => navigate("/history")}
    />
  );
}

/** /history */
function HistoryRoute() {
  const navigate = useNavigate();
  const sessionCode = sessionStorage.getItem("app_session_code") || "";
  return (
    <CustomerHistoryPage
      onBackToShopping={() => {
        navigate(sessionCode ? "/shop" : "/worker");
      }}
    />
  );
}

/** /admin */
function AdminRoute() {
  const navigate = useNavigate();
  return (
    <AdminDashboardPage
      onDemoDataReset={() => {
        clearSession();
        navigate("/worker");
      }}
    />
  );
}

/** /inventory */
function InventoryRoute() {
  return <InventoryPage />;
}

/** /stores */
function StoresRoute() {
  return <StoreManagementPage />;
}

/** /reports */
function ReportsRoute() {
  return <ReportsPage />;
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/worker" replace />} />
        <Route path="/worker" element={<WorkerRoute />} />
        <Route path="/join" element={<JoinRoute />} />
        <Route path="/join/:code" element={<JoinRoute />} />
        <Route path="/shop" element={<ShopRoute />} />
        <Route path="/history" element={<HistoryRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/inventory" element={<InventoryRoute />} />
        <Route path="/stores" element={<StoresRoute />} />
        <Route path="/reports" element={<ReportsRoute />} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/worker" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
