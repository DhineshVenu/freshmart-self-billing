import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { FiMenu, FiShoppingCart } from "react-icons/fi";
import JoinSessionPage from "./pages/JoinSessionPage";
import ShoppingPage from "./pages/ShoppingPage";
import WorkerDashboardPage from "./pages/WorkerDashboardPage";
import CustomerHistoryPage from "./pages/CustomerHistoryPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import InventoryPage from "./pages/InventoryPage";
import StoreManagementPage from "./pages/StoreManagementPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { cancelSession } from "./services/sessionApi";
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

// ─── Role-Based Smart Root Redirect ──────────────────────────────────────────

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  const sessionCode = sessionStorage.getItem("app_session_code");

  if (!isAuthenticated || !user) {
    return <Navigate to={sessionCode ? "/shop" : "/join"} replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/reports" replace />;
  }
  if (user.role === "store_manager") {
    return <Navigate to="/stores" replace />;
  }
  if (user.role === "worker") {
    return <Navigate to="/worker" replace />;
  }

  // Regular customer shopper
  return <Navigate to={sessionCode ? "/shop" : "/join"} replace />;
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
      onLeaveSession={async () => {
        try {
          await cancelSession(session.id);
        } catch {
          // ignore — not authenticated or already cancelled
        }
        clearSession();
        navigate("/join");
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
        navigate(sessionCode ? "/shop" : "/join");
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
        navigate("/reports");
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

// ─── Main App Layout with Collateral Sidebar ──────────────────────────────────

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      {/* Sleek Collateral Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Page Area */}
      <main className="app-main-content">
        {/* Mobile Header Bar with Hamburger */}
        <header className="app-mobile-topbar">
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <FiMenu />
          </button>

          <div className="mobile-brand-pill">
            <div className="brand-icon">
              <FiShoppingCart />
            </div>
            <span className="brand-text">FRESH MART</span>
          </div>

          <span className="mobile-role-badge">
            {isAuthenticated && user ? user.role.toUpperCase() : "GUEST"}
          </span>
        </header>

        {/* Dynamic Route Container */}
        <div className="app-page-container">
          <Routes>
            {/* Smart role-based home redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public authentication page */}
            <Route path="/login" element={<LoginPage />} />

            {/* Customer shopper experience */}
            <Route path="/join" element={<JoinRoute />} />
            <Route path="/join/:code" element={<JoinRoute />} />
            <Route path="/shop" element={<ShopRoute />} />
            <Route path="/history" element={<HistoryRoute />} />

            {/* Protected management routes */}
            <Route
              path="/worker"
              element={
                <ProtectedRoute roles={["worker", "admin", "store_manager"]}>
                  <WorkerRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={["admin", "store_manager", "worker"]}>
                  <InventoryRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stores"
              element={
                <ProtectedRoute roles={["admin", "store_manager"]}>
                  <StoresRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={["admin", "store_manager"]}>
                  <ReportsRoute />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
