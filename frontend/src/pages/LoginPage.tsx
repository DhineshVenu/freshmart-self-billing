import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiShield, FiLogIn, FiRefreshCw, FiShoppingCart } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { Toast, type ToastType } from "../components/Toast";
import "./LoginPage.css";

/** Role-aware redirect path after login */
function redirectPathForRole(role: string): string {
  const sessionCode = sessionStorage.getItem("app_session_code");
  switch (role) {
    case "admin":
      return "/reports";
    case "worker":
      return "/worker";
    case "store_manager":
      return "/stores";
    case "customer":
    default:
      return sessionCode ? "/shop" : "/join";
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setToast({ message: "Email and password are required.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(email.trim(), password);
      setToast({ message: `Welcome back, ${user.name}!`, type: "success" });
      // Brief delay so the toast is visible, then redirect
      setTimeout(() => navigate(redirectPathForRole(user.role)), 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="login-card">
        <div className="login-brand-row">
          <div className="login-brand-icon">
            <FiShoppingCart />
          </div>
          <div>
            <span className="login-brand-tag">FRESH MART</span>
            <h1>Sign In</h1>
          </div>
        </div>

        <p className="login-subtitle">
          Authenticate to access the worker terminal, admin console, or your shopping session.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@freshmart.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <FiRefreshCw className="spin-icon" /> Authenticating…
              </>
            ) : (
              <>
                <FiLogIn /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-demo-hint">
          <FiShield className="hint-icon" />
          <div>
            <strong>Demo accounts:</strong>
            <br />
            Admin: <code>admin@freshmart.com</code> · Worker: <code>worker@freshmart.com</code>
          </div>
        </div>
      </div>
    </main>
  );
}
