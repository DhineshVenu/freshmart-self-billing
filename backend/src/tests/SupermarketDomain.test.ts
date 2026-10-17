import { describe, it, expect } from "vitest";
import { SupermarketDomain } from "../utils/SupermarketDomain.js";

describe("SupermarketDomain.TaxEngine", () => {
  it("should accurately calculate 5% GST with CGST and SGST split", () => {
    const subtotal = 1000;
    const result = SupermarketDomain.TaxEngine.calculateTax(subtotal);

    expect(result.subtotal).toBe(1000);
    // 5% of 1000 = 50
    expect(result.taxAmount).toBe(50);
    expect(result.cgst).toBe(25);
    expect(result.sgst).toBe(25);
    expect(result.totalAmount).toBe(1050);
  });

  it("should calculate 0 tax for 0 subtotal", () => {
    const result = SupermarketDomain.TaxEngine.calculateTax(0);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("should round decimal totals to 2 decimal places", () => {
    const subtotal = 199.99;
    const result = SupermarketDomain.TaxEngine.calculateTax(subtotal);
    // 5% of 199.99 = 9.9995 -> 10.00
    expect(result.taxAmount).toBe(10);
    expect(result.totalAmount).toBe(209.99);
  });

  it("should format Indian Rupee (INR) currency strings correctly", () => {
    const formatted = SupermarketDomain.TaxEngine.formatINR(1250.5);
    expect(formatted).toBe("₹1250.50");
  });
});

describe("SupermarketDomain.BarcodeEngine", () => {
  it("should validate standard 8-digit and 12-14 digit barcodes", () => {
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("12345678")).toBe(true);
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("8901030383748")).toBe(true);
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("012345678905")).toBe(true);
  });

  it("should reject non-numeric or out-of-range barcodes", () => {
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("abc12345")).toBe(false);
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("12")).toBe(false);
    expect(SupermarketDomain.BarcodeEngine.isValidBarcode("")).toBe(false);
  });
});

describe("SupermarketDomain.SessionEngine", () => {
  it("should generate order numbers matching ORD-XXXXXX pattern", () => {
    const orderNo = SupermarketDomain.SessionEngine.generateOrderNumber();
    expect(orderNo).toMatch(/^ORD-[A-Z0-9]{6}$/);
  });

  it("should generate distinct order numbers on successive calls", () => {
    const o1 = SupermarketDomain.SessionEngine.generateOrderNumber();
    const o2 = SupermarketDomain.SessionEngine.generateOrderNumber();
    expect(o1).not.toBe(o2);
  });
});
