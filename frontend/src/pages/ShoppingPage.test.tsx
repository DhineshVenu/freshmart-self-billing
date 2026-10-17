import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShoppingPage from "./ShoppingPage";
import * as cartApi from "../services/cartApi";
import * as checkoutApi from "../services/checkoutApi";
import type { CartData } from "../types/cart";

const mockCart: CartData = {
  sessionCode: "sess-100",
  items: [
    {
      productId: "prod-1",
      barcode: "8901234567890",
      name: "Organic Milk 1L",
      price: 65,
      quantity: 2,
      lineTotal: 130,
      availableStock: 20,
    },
  ],
  itemCount: 2,
  subtotal: 130,
  taxAmount: 6.5,
  totalAmount: 136.5,
};

const mockProducts = [
  {
    _id: "prod-1",
    barcode: "8901234567890",
    name: "Organic Milk 1L",
    price: 65,
    unit: "bottle",
    category: "Dairy",
    stockQty: 20,
    active: true,
  },
  {
    _id: "prod-2",
    barcode: "8901234098765",
    name: "Fresh Red Apple",
    price: 120,
    unit: "kg",
    category: "Produce",
    stockQty: 15,
    active: true,
  },
];

describe("ShoppingPage Component", () => {
  beforeEach(() => {
    vi.spyOn(cartApi, "getCart").mockResolvedValue(mockCart);
    vi.spyOn(cartApi, "getProducts").mockResolvedValue(mockProducts);
    vi.spyOn(checkoutApi, "getSessionOrders").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders store info, customer name, categories, and cart items", async () => {
    render(
      <ShoppingPage
        sessionCode="sess-100"
        customerName="Dhinesh"
        storeName="Fresh Mart Downtown"
      />
    );

    // Header validation
    expect(await screen.findByText("Fresh Mart Downtown")).toBeInTheDocument();
    expect(screen.getByText("Dhinesh")).toBeInTheDocument();

    // Products catalog
    expect(await screen.findByText("Fresh Red Apple")).toBeInTheDocument();

    // Cart totals
    const subtotalElements = screen.getAllByText("₹130.00");
    expect(subtotalElements.length).toBeGreaterThanOrEqual(1);

    const totalElements = screen.getAllByText("₹136.50");
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });

  it("adds an item to cart when Scan Item button on product card is clicked", async () => {
    const addSpy = vi.spyOn(cartApi, "addToCart").mockResolvedValue({
      ...mockCart,
      itemCount: 3,
    });

    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    // Click 'Scan Item' on the product card
    const scanButtons = await screen.findAllByRole("button", { name: /Scan Item/i });
    expect(scanButtons.length).toBeGreaterThan(0);
    fireEvent.click(scanButtons[1]); // Click Fresh Red Apple

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith("sess-100", "8901234098765");
    });
  });

  it("increments and decrements quantity using +/- buttons in the cart", async () => {
    const updateSpy = vi.spyOn(cartApi, "updateCartItemQty").mockResolvedValue(mockCart);

    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    await screen.findByText("Fresh Red Apple");

    // Click + button on the cart row by aria-label
    const plusBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("sess-100", "prod-1", 3);
    });

    // Click - button on the cart row by aria-label after first call settles
    const minusBtn = screen.getByLabelText("Decrease quantity");
    fireEvent.click(minusBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("sess-100", "prod-1", 1);
    });
  });

  it("removes item from cart when delete trash button is clicked", async () => {
    const deleteSpy = vi.spyOn(cartApi, "deleteCartItem").mockResolvedValue({
      ...mockCart,
      items: [],
      itemCount: 0,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
    });

    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    await screen.findByText("Fresh Red Apple");
    const removeBtn = screen.getByTitle("Remove from cart");
    fireEvent.click(removeBtn);

    expect(deleteSpy).toHaveBeenCalledWith("sess-100", "prod-1");
  });

  it("filters product catalog by category when category pill is clicked", async () => {
    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    await screen.findByText("Fresh Red Apple");

    // Click 'Dairy' filter pill
    const dairyPill = screen.getByRole("button", { name: "Dairy" });
    fireEvent.click(dairyPill);

    expect(cartApi.getProducts).toHaveBeenCalledWith("Dairy");
  });

  it("allows searching products via the search input box", async () => {
    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    const searchInput = await screen.findByPlaceholderText("Search catalog...");
    fireEvent.change(searchInput, { target: { value: "Apple" } });

    // Apple should be visible
    expect(screen.getByText("Fresh Red Apple")).toBeInTheDocument();
  });

  it("handles checkout button click and opens Digital Bill modal", async () => {
    const checkoutSpy = vi.spyOn(checkoutApi, "processCheckout").mockResolvedValue({
      order: {
        _id: "order-999",
        orderNo: "ORD-123456",
        sessionId: "sess-100",
        customerName: "Dhinesh",
        storeName: "Fresh Mart Downtown",
        items: [],
        subtotal: 130,
        taxAmount: 6.5,
        totalAmount: 136.5,
        status: "PENDING",
        paymentMethod: "UPI",
        createdAt: new Date().toISOString(),
      },
    });

    render(<ShoppingPage sessionCode="sess-100" customerName="Dhinesh" />);

    const checkoutBtn = await screen.findByRole("button", {
      name: /Proceed to Digital Checkout/i,
    });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(checkoutSpy).toHaveBeenCalledWith("sess-100", "UPI");
      expect(screen.getByText("FRESH MART SUPERMARKET")).toBeInTheDocument();
    });
  });

  it("handles leave session button correctly", async () => {
    const handleLeave = vi.fn();
    render(
      <ShoppingPage
        sessionCode="sess-100"
        customerName="Dhinesh"
        onLeaveSession={handleLeave}
      />
    );

    const leaveBtn = await screen.findByTitle("Exit and leave active session");
    fireEvent.click(leaveBtn);

    expect(handleLeave).toHaveBeenCalledTimes(1);
  });
});
