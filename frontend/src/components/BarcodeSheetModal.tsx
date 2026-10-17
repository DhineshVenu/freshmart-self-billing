/**
 * BarcodeSheetModal
 * Shows a printable A4-style grid of all product barcodes.
 * Professor / demo: open this, print it, and scan any barcode with the camera.
 */
import { FiPrinter, FiX } from "react-icons/fi";
import { BarcodeLabel } from "./BarcodeLabel";
import type { ProductData } from "../types/cart";
import "./BarcodeLabel.css";

interface BarcodeSheetModalProps {
  products: ProductData[];
  onClose: () => void;
}

export function BarcodeSheetModal({ products, onClose }: BarcodeSheetModalProps) {
  return (
    <div className="barcode-sheet-overlay" onClick={onClose}>
      <div
        className="barcode-sheet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="barcode-sheet-header">
          <h2>🏪 Fresh Mart — Product Barcode Sheet</h2>
          <div className="barcode-sheet-actions">
            <button
              type="button"
              className="btn-print"
              onClick={() => window.print()}
            >
              <FiPrinter /> Print / Save PDF
            </button>
            <button
              type="button"
              className="btn-close-sheet"
              onClick={onClose}
            >
              <FiX /> Close
            </button>
          </div>
        </div>

        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, marginTop: -8 }}>
          Print this sheet and scan any barcode with the camera scanner, or use the Expo mobile app.
        </p>

        <div className="barcode-grid">
          {products.map((product) => (
            <div key={product._id} className="barcode-grid-card">
              <span className="product-category-tag">{product.category}</span>
              <BarcodeLabel
                value={product.barcode}
                width={2}
                height={55}
                fontSize={12}
              />
              <span className="product-full-name">{product.name}</span>
              <span className="product-price-tag">₹{product.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
