import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DigitalBillModal } from "./DigitalBillModal";
import type { OrderData, PaymentData } from "../services/checkoutApi";
import * as checkoutApi from "../services/checkoutApi";

const mockOrder: OrderData = {
  _id: "order-123",
  orderNo: "ORD-998877",
  sessionId: "session-abc",
  customerName: "Dhinesh",
  customerEmail: "dhinesh@example.com",
  storeName: "Fresh Mart Downtown",
  items: [
    {
      productId: "prod-1",
      barcode: "8901234567890",
      name: "Organic Milk 1L",
      price: 65,
      unit: "bottle",
      quantity: 2,
      lineTotal: 130,
    },
    {
      productId: "prod-2",
      barcode: "8901234098765",
      name: "Whole Wheat Bread",
      price: 45,
      unit: "pack",
      quantity: 1,
      lineTotal: 45,
    },
  ],
  subtotal: 175,
  taxAmount: 8.75,
  totalAmount: 183.75,
  status: "PENDING",
  paymentMethod: "UPI",
  createdAt: "2026-11-01T10:00:00.000Z",
};

describe("DigitalBillModal component", () => {
  it("renders order details, items, tax breakdown, and visual elements correctly", () => {
    const handleClose = vi.fn();
    render(<DigitalBillModal order={mockOrder} onClose={handleClose} />);

    // Visual header and store info
    expect(screen.getByText("FRESH MART SUPERMARKET")).toBeInTheDocument();
    expect(screen.getByText(/Fresh Mart Downtown/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-998877/)).toBeInTheDocument();
    expect(screen.getByText(/Dhinesh/)).toBeInTheDocument();

    // Items list
    expect(screen.getByText("Organic Milk 1L")).toBeInTheDocument();
    expect(screen.getByText("Whole Wheat Bread")).toBeInTheDocument();

    // Subtotal and Grand Total
    expect(screen.getByText("₹175.00")).toBeInTheDocument();
    expect(screen.getByText("₹8.75")).toBeInTheDocument();
    expect(screen.getByText("₹183.75")).toBeInTheDocument();

    // Status badge for PENDING
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  }, 15000);

  it("handles Close button click correctly", () => {
    const handleClose = vi.fn();
    render(<DigitalBillModal order={mockOrder} onClose={handleClose} />);

    // Click Close button by title
    const closeBtn = screen.getByTitle("Close modal");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("triggers window.print when Print Receipt button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<DigitalBillModal order={mockOrder} onClose={vi.fn()} />);

    const printBtn = screen.getByRole("button", { name: /Print Bill/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("calls onConfirmPayment when worker/customer clicks Confirm Payment button", () => {
    const handleConfirm = vi.fn();
    render(
      <DigitalBillModal
        order={mockOrder}
        onClose={vi.fn()}
        onConfirmPayment={handleConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /Confirm Payment & Complete Session/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables payment button when isConfirming is true", () => {
    render(
      <DigitalBillModal
        order={mockOrder}
        onClose={vi.fn()}
        onConfirmPayment={vi.fn()}
        isConfirming={true}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /Processing Payment/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("sends digital receipt email when email form is submitted", async () => {
    vi.spyOn(checkoutApi, "sendReceiptEmail").mockResolvedValueOnce({
      success: true,
      message: "Tax invoice dispatched successfully.",
      previewUrl: "https://ethereal.email/message/test",
    });

    render(<DigitalBillModal order={mockOrder} onClose={vi.fn()} />);

    const emailInput = screen.getByPlaceholderText(/customer@example.com/i);
    fireEvent.change(emailInput, { target: { value: "test@freshmart.com" } });

    const sendBtn = screen.getByRole("button", { name: /Send Bill/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Tax invoice dispatched successfully/i)
      ).toBeInTheDocument();
    });
  });

  it("displays settled state with complete session button when order is PAID", () => {
    const handleComplete = vi.fn();
    const handleClose = vi.fn();
    const paidOrder: OrderData = {
      ...mockOrder,
      status: "PAID",
      paidAt: "2026-11-01T10:05:00.000Z",
    };
    const paymentInfo: PaymentData = {
      orderId: "order-123",
      orderNo: "ORD-998877",
      amount: 183.75,
      method: "UPI",
      status: "COMPLETED",
      idempotencyKey: "idem-key",
      confirmedAt: "2026-11-01T10:05:00.000Z",
    };

    render(
      <DigitalBillModal
        order={paidOrder}
        payment={paymentInfo}
        onClose={handleClose}
        onSessionComplete={handleComplete}
      />
    );

    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("VERIFIED & PAID ✓")).toBeInTheDocument();
    expect(screen.getByText(/Method:\s*UPI/)).toBeInTheDocument();

    const finishBtn = screen.getByRole("button", { name: /Finish & View Receipt History/i });
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});
