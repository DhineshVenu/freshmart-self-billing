import React, { useState } from "react";
import {
  FiCheckCircle,
  FiPrinter,
  FiX,
  FiShield,
  FiMail,
  FiSend,
  FiExternalLink,
  FiCheck,
} from "react-icons/fi";
import { type OrderData, type PaymentData, sendReceiptEmail } from "../services/checkoutApi";
import "./DigitalBillModal.css";

interface DigitalBillModalProps {
  order: OrderData;
  payment?: PaymentData;
  onClose: () => void;
  onConfirmPayment?: () => void;
  isConfirming?: boolean;
  onSessionComplete?: () => void;
}

export const DigitalBillModal: React.FC<DigitalBillModalProps> = ({
  order,
  payment,
  onClose,
  onConfirmPayment,
  isConfirming = false,
  onSessionComplete,
}) => {
  const [emailInput, setEmailInput] = useState(order.customerEmail || "");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    success: boolean;
    message: string;
    previewUrl?: string | false;
  } | null>(
    order.receiptEmailSent
      ? {
          success: true,
          message: `E-receipt previously sent to ${order.customerEmail || "customer"}`,
        }
      : null
  );

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.trim()) return;

    try {
      setIsSendingEmail(true);
      setEmailFeedback(null);
      const res = await sendReceiptEmail(order._id, emailInput.trim());
      setEmailFeedback({
        success: true,
        message: res.message || `Receipt dispatched to ${emailInput.trim()}`,
        previewUrl: res.previewUrl,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to send receipt email";
      setEmailFeedback({
        success: false,
        message: errMsg,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="bill-modal-overlay">
      <div className="bill-modal-card printable-bill">
        {/* Header Actions */}
        <div className="bill-modal-top-actions no-print">
          <div className="bill-modal-title">
            <FiShield className="shield-icon" /> Official Digital GST Invoice
          </div>
          <div className="top-action-buttons">
            <button
              type="button"
              className="print-btn"
              onClick={handlePrint}
              title="Print Receipt"
            >
              <FiPrinter /> Print Bill
            </button>
            <button
              type="button"
              className="close-bill-btn"
              onClick={onClose}
              title="Close modal"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Bill Header */}
        <div className="receipt-header">
          <h2>FRESH MART SUPERMARKET</h2>
          <p className="store-address">
            {order.storeName} • GSTIN: 29AAAAA0000A1Z5
          </p>
          <p className="receipt-type-tag">TAX INVOICE / DIGITAL BILL</p>
        </div>

        {/* Receipt Meta info */}
        <div className="receipt-meta-grid">
          <div className="meta-col">
            <div>
              <strong>Invoice No:</strong> {order.orderNo}
            </div>
            <div>
              <strong>Session ID:</strong> #{order.sessionId.slice(0, 8)}
            </div>
            <div>
              <strong>Customer:</strong> {order.customerName}
            </div>
            {order.customerEmail && (
              <div>
                <strong>Email:</strong> {order.customerEmail}
              </div>
            )}
          </div>
          <div className="meta-col text-right">
            <div>
              <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
            </div>
            <div>
              <strong>Time:</strong> {new Date(order.createdAt).toLocaleTimeString()}
            </div>
            <div>
              <strong>Payment Status:</strong>{" "}
              <span
                className={`status-pill ${
                  order.status === "PAID" ? "paid" : "pending"
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="receipt-items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th className="text-center">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <div className="item-name">{item.name}</div>
                  <div className="item-barcode">#{item.barcode}</div>
                </td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">₹{item.price.toFixed(2)}</td>
                <td className="text-right">₹{item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Summary */}
        <div className="receipt-totals-section">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>GST Tax (5% included):</span>
            <span>₹{order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="totals-row grand-total">
            <span>Grand Total (INR):</span>
            <strong>₹{order.totalAmount.toFixed(2)}</strong>
          </div>
        </div>

        {/* Payment Confirmation Details */}
        <div className="receipt-footer-details">
          {order.status === "PAID" ? (
            <div className="verified-seal">
              <FiCheckCircle className="check-seal-icon" />
              <div>
                <strong>VERIFIED & PAID ✓</strong>
                <p>
                  Method: {order.paymentMethod || "UPI"} • Confirmed by:{" "}
                  {payment?.confirmedBy || "Worker POS Counter"}
                </p>
              </div>
            </div>
          ) : (
            <div className="pending-seal">
              <strong>PAYMENT PENDING</strong>
              <p>Please present this digital invoice at the POS Exit Counter.</p>
            </div>
          )}

          <p className="thank-you-msg">
            Thank you for shopping at Fresh Mart! Save Paper • Go Digital
          </p>
        </div>

        {/* Email Receipt Section (Nodemailer Feature) */}
        <div className="email-receipt-card no-print">
          <div className="email-receipt-title">
            <FiMail className="mail-icon" />
            <span>Send E-Receipt via Nodemailer</span>
          </div>
          <form className="email-receipt-form" onSubmit={handleSendEmail}>
            <input
              type="email"
              placeholder="customer@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="email-input-field"
              required
            />
            <button
              type="submit"
              className="send-email-btn"
              disabled={isSendingEmail || !emailInput.trim()}
            >
              {isSendingEmail ? (
                "Sending..."
              ) : (
                <>
                  <FiSend /> Send Bill
                </>
              )}
            </button>
          </form>

          {emailFeedback && (
            <div
              className={`email-feedback-box ${
                emailFeedback.success ? "success" : "error"
              }`}
            >
              <div className="feedback-content">
                {emailFeedback.success && <FiCheck className="feedback-check" />}
                <span>{emailFeedback.message}</span>
              </div>
              {emailFeedback.previewUrl && (
                <a
                  href={emailFeedback.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="preview-link"
                >
                  <FiExternalLink /> Open Email Preview (Ethereal)
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions for Worker / Customer */}
        <div className="bill-bottom-actions no-print">
          {order.status !== "PAID" && onConfirmPayment && (
            <button
              type="button"
              className="confirm-payment-action-btn"
              onClick={onConfirmPayment}
              disabled={isConfirming}
            >
              {isConfirming ? (
                "Processing Payment..."
              ) : (
                <>
                  <FiCheckCircle /> Confirm Payment & Complete Session
                </>
              )}
            </button>
          )}

          {order.status === "PAID" ? (
            <div style={{ display: "flex", gap: "10px", width: "100%", flexWrap: "wrap" }}>
              {onSessionComplete && (
                <button
                  type="button"
                  className="confirm-payment-action-btn"
                  style={{ background: "#047857", flex: "1 1 200px" }}
                  onClick={() => {
                    onClose();
                    onSessionComplete();
                  }}
                >
                  <FiCheckCircle /> Finish & View Receipt History
                </button>
              )}
              <button
                type="button"
                className="close-full-btn"
                style={{ flex: onSessionComplete ? "0 1 120px" : "1" }}
                onClick={onClose}
              >
                Close Bill
              </button>
            </div>
          ) : (
            <button type="button" className="close-full-btn" onClick={onClose}>
              Back to Cart (Payment Pending)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
