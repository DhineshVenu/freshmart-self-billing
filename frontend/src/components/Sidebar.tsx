import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiShoppingCart,
  FiUserCheck,
  FiFileText,
  FiSliders,
  FiPackage,
  FiBarChart2,
  FiGrid,
  FiLogOut,
  FiLogIn,
  FiShield,
  FiX,
  FiAward,
  FiHeart,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { getProfile, type CustomerProfile } from "../services/authApi";
import "./Sidebar.css";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const sessionCode = sessionStorage.getItem("app_session_code") || "";

  // Load customer bounty points when customer is logged in
  useEffect(() => {
    if (isAuthenticated && user?.role === "customer") {
      getProfile()
        .then(setProfile)
        .catch(() => {
          // ignore if failed or unauthenticated
        });
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, user?.role, location.pathname]);

  const isActive = (path: string) => {
    if (path === "/join") {
      return location.pathname.startsWith("/join");
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem("app_active_session");
    sessionStorage.removeItem("app_session_code");
    onCloseMobile();
    navigate("/login");
  };

  // Role tag info
  const getRoleBadge = () => {
    if (!isAuthenticated) return { label: "GUEST SHOPPER", color: "#64748b" };
    switch (user?.role) {
      case "admin":
        return { label: "ADMINISTRATOR", color: "#8b5cf6" };
      case "worker":
        return { label: "STORE CASHIER", color: "#047857" };
      case "store_manager":
        return { label: "STORE MANAGER", color: "#ec4899" };
      case "customer":
      default:
        return { label: "LOYALTY MEMBER", color: "#10b981" };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-icon-box">
              <FiShoppingCart />
            </div>
            <div className="brand-copy">
              <div className="brand-title-row">
                <span className="brand-name">FRESH MART</span>
                <span className="live-dot" title="Store Online"></span>
              </div>
              <span
                className="brand-role-tag"
                style={{ color: roleBadge.color, borderColor: `${roleBadge.color}40` }}
              >
                {roleBadge.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <FiX />
          </button>
        </div>

        {/* Active Cart Quick Pill (if session is active) */}
        {sessionCode && (
          <div className="sidebar-session-widget">
            <div className="session-widget-top">
              <span className="session-pulse-dot"></span>
              <span className="session-widget-label">ACTIVE CART SESSION</span>
            </div>
            <div className="session-widget-code">
              #{sessionCode.slice(0, 8)}
            </div>
            <button
              type="button"
              className="session-resume-btn"
              onClick={() => handleNav("/shop")}
            >
              <FiShoppingCart /> Resume Shopping
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="sidebar-scrollable-nav">
          {/* ════════════════ CUSTOMER VIEW ════════════════ */}
          {user?.role === "customer" && (
            <>
              <div className="nav-group-title">CUSTOMER EXPERIENCE</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/shop") ? "active" : ""}`}
                  onClick={() => handleNav(sessionCode ? "/shop" : "/join")}
                >
                  <span className="nav-icon"><FiShoppingCart /></span>
                  <span className="nav-label">Scan & Self-Bill</span>
                  {sessionCode && <span className="nav-badge pulse">Live</span>}
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/join") ? "active" : ""}`}
                  onClick={() => handleNav("/join")}
                >
                  <span className="nav-icon"><FiUserCheck /></span>
                  <span className="nav-label">Store Entrance & QR</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/history") ? "active" : ""}`}
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon"><FiFileText /></span>
                  <span className="nav-label">My Orders & Receipts</span>
                </button>
              </nav>

              <div className="nav-group-title">HEALTH & REWARDS</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className="nav-item-btn"
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon" style={{ color: "#f59e0b" }}><FiAward /></span>
                  <span className="nav-label">Fresh Points & Wallet</span>
                  {profile && profile.bountyPoints > 0 && (
                    <span className="nav-badge pts">{profile.bountyPoints} pts</span>
                  )}
                </button>

                <button
                  type="button"
                  className="nav-item-btn"
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon" style={{ color: "#ec4899" }}><FiHeart /></span>
                  <span className="nav-label">Dietary & Allergen Prefs</span>
                </button>
              </nav>
            </>
          )}

          {/* ════════════════ ADMIN VIEW ════════════════ */}
          {user?.role === "admin" && (
            <>
              <div className="nav-group-title">EXECUTIVE SUITE</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/reports") ? "active" : ""}`}
                  onClick={() => handleNav("/reports")}
                >
                  <span className="nav-icon" style={{ color: "#10b981" }}><FiBarChart2 /></span>
                  <span className="nav-label">Reports & Analytics</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/admin") ? "active" : ""}`}
                  onClick={() => handleNav("/admin")}
                >
                  <span className="nav-icon" style={{ color: "#8b5cf6" }}><FiSliders /></span>
                  <span className="nav-label">Products & Staff Console</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/inventory") ? "active" : ""}`}
                  onClick={() => handleNav("/inventory")}
                >
                  <span className="nav-icon" style={{ color: "#f59e0b" }}><FiPackage /></span>
                  <span className="nav-label">Inventory & Stock</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/stores") ? "active" : ""}`}
                  onClick={() => handleNav("/stores")}
                >
                  <span className="nav-icon" style={{ color: "#ec4899" }}><FiGrid /></span>
                  <span className="nav-label">Stores Management</span>
                </button>
              </nav>

              <div className="nav-group-title">OPERATIONS & TEST VIEW</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/worker") ? "active" : ""}`}
                  onClick={() => handleNav("/worker")}
                >
                  <span className="nav-icon" style={{ color: "#047857" }}><FiShield /></span>
                  <span className="nav-label">Worker POS Terminal</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/history") ? "active" : ""}`}
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon"><FiFileText /></span>
                  <span className="nav-label">Customer Receipts Audit</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/join") ? "active" : ""}`}
                  onClick={() => handleNav("/join")}
                >
                  <span className="nav-icon"><FiUserCheck /></span>
                  <span className="nav-label">Customer App Simulator</span>
                </button>
              </nav>
            </>
          )}

          {/* ════════════════ WORKER / STORE MANAGER VIEW ════════════════ */}
          {(user?.role === "worker" || user?.role === "store_manager") && (
            <>
              <div className="nav-group-title">STORE OPERATIONS</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/worker") ? "active" : ""}`}
                  onClick={() => handleNav("/worker")}
                >
                  <span className="nav-icon" style={{ color: "#047857" }}><FiShield /></span>
                  <span className="nav-label">Worker POS Terminal</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/inventory") ? "active" : ""}`}
                  onClick={() => handleNav("/inventory")}
                >
                  <span className="nav-icon" style={{ color: "#f59e0b" }}><FiPackage /></span>
                  <span className="nav-label">Live Inventory</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/stores") ? "active" : ""}`}
                  onClick={() => handleNav("/stores")}
                >
                  <span className="nav-icon" style={{ color: "#ec4899" }}><FiGrid /></span>
                  <span className="nav-label">Stores Overview</span>
                </button>

                {user.role === "store_manager" && (
                  <button
                    type="button"
                    className={`nav-item-btn ${isActive("/reports") ? "active" : ""}`}
                    onClick={() => handleNav("/reports")}
                  >
                    <span className="nav-icon" style={{ color: "#10b981" }}><FiBarChart2 /></span>
                    <span className="nav-label">Store Reports</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/history") ? "active" : ""}`}
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon"><FiFileText /></span>
                  <span className="nav-label">Order Bills & Receipts</span>
                </button>
              </nav>
            </>
          )}

          {/* ════════════════ GUEST / NOT LOGGED IN VIEW ════════════════ */}
          {!isAuthenticated && (
            <>
              <div className="nav-group-title">SELF-SERVICE SHOPPING</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/join") ? "active" : ""}`}
                  onClick={() => handleNav("/join")}
                >
                  <span className="nav-icon"><FiUserCheck /></span>
                  <span className="nav-label">Customer Check-In</span>
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/shop") ? "active" : ""}`}
                  onClick={() => handleNav(sessionCode ? "/shop" : "/join")}
                >
                  <span className="nav-icon"><FiShoppingCart /></span>
                  <span className="nav-label">Active Cart & Scanner</span>
                  {sessionCode && <span className="nav-badge pulse">Active</span>}
                </button>

                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/history") ? "active" : ""}`}
                  onClick={() => handleNav("/history")}
                >
                  <span className="nav-icon"><FiFileText /></span>
                  <span className="nav-label">Lookup Receipts</span>
                </button>
              </nav>

              <div className="nav-group-title">STAFF & ACCOUNTS</div>
              <nav className="nav-items-list">
                <button
                  type="button"
                  className={`nav-item-btn ${isActive("/login") ? "active" : ""}`}
                  onClick={() => handleNav("/login")}
                >
                  <span className="nav-icon" style={{ color: "#0284c7" }}><FiLogIn /></span>
                  <span className="nav-label">Sign In / Register</span>
                </button>
              </nav>
            </>
          )}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="sidebar-footer">
          {isAuthenticated && user ? (
            <div className="user-profile-card">
              <div className="user-avatar-initials" style={{ borderColor: roleBadge.color }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name" title={user.name}>
                  {user.name}
                </div>
                <div className="user-email" title={user.email}>
                  {user.email}
                </div>
                {profile && user.role === "customer" && (
                  <div className="user-bounty-mini">
                    🪙 {profile.bountyPoints} pts (₹{profile.bountyWalletBalance.toFixed(2)})
                  </div>
                )}
              </div>
              <button
                type="button"
                className="user-logout-btn"
                onClick={handleLogout}
                title="Sign out of Fresh Mart"
              >
                <FiLogOut />
              </button>
            </div>
          ) : (
            <div className="guest-login-card">
              <div className="guest-info">
                <span className="guest-title">Ready to Shop?</span>
                <span className="guest-sub">Sign in for Fresh Points rewards</span>
              </div>
              <button
                type="button"
                className="guest-signin-btn"
                onClick={() => handleNav("/login")}
              >
                <FiLogIn /> Sign In
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
