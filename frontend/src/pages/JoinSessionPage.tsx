import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiUser,
  FiShoppingBag,
  FiArrowRight,
  FiArrowLeft,
  FiClock,
  FiRefreshCw,
  FiShield,
  FiMail,
} from "react-icons/fi";
import { getSessionByCode, joinShoppingSession } from "../services/sessionApi";
import type { ShoppingSessionData } from "../types/session";
import { Toast, type ToastType } from "../components/Toast";
import "./JoinSessionPage.css";

interface JoinSessionPageProps {
  sessionCode: string;
  onBackToWorker?: () => void;
  onStartShopping?: (session: ShoppingSessionData) => void;
  onSelectSessionCode?: (code: string) => void;
}

function JoinSessionPage({
  sessionCode,
  onBackToWorker,
  onStartShopping,
  onSelectSessionCode,
}: JoinSessionPageProps) {
  const [currentCode, setCurrentCode] = useState<string>(sessionCode);
  const [session, setSession] = useState<ShoppingSessionData | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [isFetchingSession, setIsFetchingSession] = useState<boolean>(true);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [enteredCode, setEnteredCode] = useState<string>("");
  const [activeSessionsList, setActiveSessionsList] = useState<ShoppingSessionData[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );

  const fetchSessionDetails = async (codeToFetch: string) => {
    try {
      setIsFetchingSession(true);
      const response = await getSessionByCode(codeToFetch);
      setSession(response.data.session);
      setCurrentCode(codeToFetch);
      if (onSelectSessionCode) {
        onSelectSessionCode(codeToFetch);
      }

      if (response.data.session.joinedCustomerName) {
        setIsJoined(true);
        setCustomerName(response.data.session.joinedCustomerName);
      }
      if (response.data.session.joinedCustomerEmail) {
        setCustomerEmail(response.data.session.joinedCustomerEmail);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to load shopping session details";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsFetchingSession(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/sessions");
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.sessions)) {
        setActiveSessionsList(data.data.sessions.filter((s: ShoppingSessionData) => s.status === "ACTIVE"));
      }
    } catch {
      // ignore error
    }
  };

  useEffect(() => {
    if (sessionCode) {
      setCurrentCode(sessionCode);
      fetchSessionDetails(sessionCode);
    } else {
      setIsFetchingSession(false);
      loadActiveSessions();
    }
  }, [sessionCode]);

  const handleJoinSession = async (): Promise<void> => {
    if (!customerName.trim()) {
      setToast({ message: "Please enter your full name to check in.", type: "error" });
      return;
    }

    try {
      setIsJoining(true);
      const response = await joinShoppingSession(
        currentCode || sessionCode,
        customerName.trim(),
        customerEmail.trim() || undefined
      );
      setSession(response.data.session);
      setIsJoined(true);
      setToast({
        message: "Welcome! Shopping session verified & activated ✓",
        type: "success",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to join shopping session";
      setToast({ message: msg, type: "error" });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="customer-checkin-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="checkin-container">
        {/* Step Progress Tracker */}
        <div className="steps-tracker">
          <div className="step-node active">
            <span className="step-number">1</span>
            <span className="step-text">Scan QR</span>
          </div>
          <div className={`step-connector ${session ? "filled" : ""}`} />
          <div className={`step-node ${session ? "active" : ""}`}>
            <span className="step-number">2</span>
            <span className="step-text">Customer Name</span>
          </div>
          <div className={`step-connector ${isJoined ? "filled" : ""}`} />
          <div className={`step-node ${isJoined ? "active" : ""}`}>
            <span className="step-number">3</span>
            <span className="step-text">Start Billing</span>
          </div>
        </div>

        <div className="checkin-card">
          <header className="checkin-card-header">
            <div className="header-icon-box">
              <FiShoppingBag />
            </div>
            <div>
              <span className="customer-tag">SELF-CHECKOUT PASS</span>
              <h1>Customer Session Check-In</h1>
              <p className="header-desc">
                Authorized entry pass for contactless supermarket self-billing.
              </p>
            </div>
          </header>

          <div className="checkin-card-body">
            {isFetchingSession ? (
              <div className="state-box loading">
                <FiRefreshCw className="spin-icon large" />
                <p>Verifying shopping session token...</p>
              </div>
            ) : !session ? (
              <div className="manual-session-picker">
                <div className="manual-lookup-box">
                  <h3 className="lookup-title">Enter Session Token or Select Active Store Session</h3>
                  <p className="manual-lookup-sub">
                    Scan the QR code at the supermarket entrance, enter the session code manually, or select an active terminal session below.
                  </p>
                  <form
                    className="manual-code-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (enteredCode.trim()) {
                        fetchSessionDetails(enteredCode.trim());
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Enter session token (e.g. 507f1f77bcf86cd799439011)"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      className="manual-code-input"
                    />
                    <button type="submit" className="manual-code-submit-btn">
                      <FiArrowRight /> Verify Session
                    </button>
                  </form>
                </div>

                {activeSessionsList.length > 0 && (
                  <div className="available-sessions-list">
                    <h4>Or Select an Active Supermarket Session:</h4>
                    <div className="sessions-mini-grid">
                      {activeSessionsList.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="session-select-card"
                          onClick={() => fetchSessionDetails(s.id)}
                        >
                          <div className="session-select-header">
                            <strong>{s.storeName}</strong>
                            <span className="session-status-tag">{s.status}</span>
                          </div>
                          <span className="session-id-preview">Session #{s.id.slice(0, 8)}...</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {onBackToWorker && (
                  <div className="state-box-actions">
                    <button
                      type="button"
                      className="return-btn"
                      onClick={onBackToWorker}
                    >
                      <FiArrowLeft /> Return to Worker Terminal
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="session-active-flow">
                {/* Store Banner */}
                <div className="store-badge-card">
                  <div className="store-badge-left">
                    <FiShoppingBag className="store-icon" />
                    <div>
                      <span className="store-supermarket-tag">STORE OUTLET</span>
                      <h3>{session.storeName}</h3>
                    </div>
                  </div>
                  <div className="session-token-pill">
                    <code>#{session.id.slice(0, 8)}...</code>
                  </div>
                </div>

                {!isJoined ? (
                  <form
                    className="customer-name-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinSession();
                    }}
                  >
                    <div className="input-group">
                      <label htmlFor="custName" className="input-label">
                        <FiUser className="label-icon" /> Enter Your Full Name
                      </label>
                      <input
                        id="custName"
                        type="text"
                        value={customerName}
                        placeholder="e.g. Rahul Sharma"
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isJoining}
                        className="cust-name-input"
                        autoFocus
                      />
                      <span className="input-help">
                        Your name will appear on the verified digital GST bill receipt.
                      </span>
                    </div>

                    <div className="input-group">
                      <label htmlFor="custEmail" className="input-label">
                        <FiMail className="label-icon" /> Email Address (Optional for E-Receipt)
                      </label>
                      <input
                        id="custEmail"
                        type="email"
                        value={customerEmail}
                        placeholder="e.g. rahul@example.com"
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        disabled={isJoining}
                        className="cust-name-input"
                      />
                      <span className="input-help">
                        We'll automatically email your itemized digital tax invoice after checkout.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="join-session-submit-btn"
                      disabled={isJoining}
                    >
                      {isJoining ? (
                        <>
                          <FiRefreshCw className="spin-icon" /> Activating Session...
                        </>
                      ) : (
                        <>
                          <FiShield /> Join Shopping Session
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="joined-confirmation-box">
                    <div className="verified-badge-row">
                      <div className="check-circle-icon">
                        <FiCheckCircle />
                      </div>
                      <div>
                        <h2>Shopping Session Activated!</h2>
                        <p className="verified-sub">
                          Welcome, <strong>{session.joinedCustomerName}</strong>. You are
                          ready to scan barcodes.
                        </p>
                      </div>
                    </div>

                    <div className="session-timestamp-grid">
                      <div className="time-item">
                        <span className="time-label">CUSTOMER NAME</span>
                        <strong>{session.joinedCustomerName}</strong>
                      </div>
                      <div className="time-item">
                        <span className="time-label">CHECKED IN AT</span>
                        <div className="time-val">
                          <FiClock className="clock-icon" />
                          <span>
                            {session.joinedAt
                              ? new Date(session.joinedAt).toLocaleTimeString()
                              : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="launch-shopping-btn"
                      onClick={() => {
                        if (onStartShopping && session) {
                          onStartShopping(session);
                        }
                      }}
                    >
                      <span>Start Scanning & Billing</span>
                      <FiArrowRight className="arrow-icon" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {onBackToWorker && (
            <footer className="checkin-footer">
              <button
                type="button"
                className="back-worker-link"
                onClick={onBackToWorker}
              >
                <FiArrowLeft /> Switch to POS Worker Terminal
              </button>
            </footer>
          )}
        </div>
      </div>
    </main>
  );
}

export default JoinSessionPage;
