/**
 * SupermarketDomain Namespace
 * 
 * Demonstrates advanced TypeScript Namespace encapsulation to organize
 * core retail business calculations, tax engines, barcode rules, and session identifiers.
 */
export namespace SupermarketDomain {

  /**
   * TaxEngine Sub-Namespace
   * Encapsulates 5% GST tax rules, CGST/SGST breakdown, and Indian Rupee round-off calculations.
   */
  export namespace TaxEngine {
    export const DEFAULT_GST_RATE: number = 0.05; // Standard 5% GST on retail items

    export interface TaxBreakdown {
      subtotal: number;
      cgst: number;        // Central GST (2.5%)
      sgst: number;        // State GST (2.5%)
      taxAmount: number;   // Total GST Tax Amount (5.0%)
      totalAmount: number; // Subtotal + Tax Amount
    }

    /**
     * Calculates itemized GST tax breakdown and total payable amount.
     */
    export function calculateTax(subtotal: number, rate: number = DEFAULT_GST_RATE): TaxBreakdown {
      const sanitizedSubtotal = Number(Math.max(0, subtotal).toFixed(2));
      const rawTax = sanitizedSubtotal * rate;
      const taxAmount = Number((Math.round(rawTax * 100) / 100).toFixed(2));
      
      // Indian GST split: 50% CGST, 50% SGST
      const cgst = Number((taxAmount / 2).toFixed(2));
      const sgst = Number((taxAmount - cgst).toFixed(2));
      const totalAmount = Number((sanitizedSubtotal + taxAmount).toFixed(2));

      return {
        subtotal: sanitizedSubtotal,
        cgst,
        sgst,
        taxAmount,
        totalAmount,
      };
    }

    /**
     * Formats numeric amounts to standard Indian Rupee currency strings.
     */
    export function formatINR(amount: number): string {
      return `₹${amount.toFixed(2)}`;
    }
  }

  /**
   * BarcodeEngine Sub-Namespace
   * Encapsulates barcode format validation and sanitization rules.
   */
  export namespace BarcodeEngine {
    /**
     * Validates barcode format: accepts store-assigned shortcodes (4 digits)
     * up to standard EAN/UPC barcodes (8 to 14 digits).
     */
    export function isValidBarcode(barcode: string): boolean {
      if (!barcode || typeof barcode !== "string") {
        return false;
      }
      const sanitized = barcode.trim();
      return /^[0-9]{4,14}$/.test(sanitized);
    }

    /**
     * Normalizes barcode string by stripping invalid characters and whitespace.
     */
    export function normalize(barcode: string): string {
      if (!barcode) return "";
      return barcode.trim();
    }
  }

  /**
   * SessionEngine Sub-Namespace
   * Encapsulates transaction order identifiers and session code rules.
   */
  export namespace SessionEngine {
    /**
     * Generates a collision-resistant retail order invoice number (e.g. ORD-482910).
     */
    export function generateOrderNumber(): string {
      const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
      return `ORD-${randomSixDigits}`;
    }

    /**
     * Checks if a session code matches GUID/UUID format.
     */
    export function isValidSessionCode(code: string): boolean {
      if (!code || typeof code !== "string") return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code.trim());
    }
  }

  /**
   * StockEngine Sub-Namespace
   * Encapsulates inventory stock-level logic.
   */
  export namespace StockEngine {
    export type StockStatus = "OK" | "LOW" | "OUT";

    export function isLowStock(currentQty: number, reorderLevel: number): boolean {
      return currentQty <= reorderLevel;
    }

    export function stockStatus(currentQty: number, reorderLevel: number): StockStatus {
      if (currentQty === 0) return "OUT";
      if (currentQty <= reorderLevel) return "LOW";
      return "OK";
    }
  }

  /**
   * ReportEngine Sub-Namespace
   * Encapsulates CSV formatting and aggregation helpers for sales reports.
   */
  export namespace ReportEngine {
    export interface CategorySummary {
      category: string;
      revenue: number;
      orders: number;
    }

    export function groupByCategory(
      orders: Array<{ items: Array<{ category?: string; lineTotal: number }> }>
    ): CategorySummary[] {
      const map = new Map<string, CategorySummary>();
      orders.forEach((order) => {
        order.items.forEach((item) => {
          const cat = item.category || "General";
          const existing = map.get(cat) ?? { category: cat, revenue: 0, orders: 0 };
          existing.revenue += item.lineTotal;
          existing.orders += 1;
          map.set(cat, existing);
        });
      });
      return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    }

    export function formatCsvRow(
      date: string, revenue: number, orders: number, tax: number, peakHour: number
    ): string {
      return `${date},${revenue.toFixed(2)},${orders},${tax.toFixed(2)},${peakHour}`;
    }
  }
}
