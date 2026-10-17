import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JoinSessionPage from "./JoinSessionPage";
import * as sessionApi from "../services/sessionApi";
import type { ShoppingSessionData } from "../types/session";

const mockActiveSession: ShoppingSessionData = {
  id: "session-abc-12345",
  storeName: "Fresh Mart Downtown",
  workerId: "worker-1",
  status: "ACTIVE",
  createdAt: "2026-11-01T10:00:00.000Z",
};

describe("JoinSessionPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders manual session code input and allows searching for a session", async () => {
    vi.spyOn(sessionApi, "getSessionByCode").mockResolvedValue({
      success: true,
      data: { session: mockActiveSession },
    });

    render(<JoinSessionPage sessionCode="" />);

    expect(screen.getByText("Customer Session Check-In")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter session token/i)
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Enter session token/i);
    fireEvent.change(input, { target: { value: "session-abc-12345" } });

    const verifyBtn = screen.getByRole("button", { name: /Verify Session/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText("Fresh Mart Downtown")).toBeInTheDocument();
    });
  });

  it("loads existing session info automatically when sessionCode prop is provided", async () => {
    vi.spyOn(sessionApi, "getSessionByCode").mockResolvedValue({
      success: true,
      data: { session: mockActiveSession },
    });

    render(<JoinSessionPage sessionCode="session-abc-12345" />);

    expect(await screen.findByText("Fresh Mart Downtown")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rahul Sharma/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Join Shopping Session/i })
    ).toBeInTheDocument();
  });

  it("submits customer name and email to join the session", async () => {
    vi.spyOn(sessionApi, "getSessionByCode").mockResolvedValue({
      success: true,
      data: { session: mockActiveSession },
    });

    const joinedSession: ShoppingSessionData = {
      ...mockActiveSession,
      joinedCustomerName: "Dhinesh",
      joinedCustomerEmail: "dhinesh@example.com",
      joinedAt: "2026-11-01T10:02:00.000Z",
    };

    const joinSpy = vi
      .spyOn(sessionApi, "joinShoppingSession")
      .mockResolvedValue({
        success: true,
        data: { session: joinedSession },
      });

    render(<JoinSessionPage sessionCode="session-abc-12345" />);

    await screen.findByText("Fresh Mart Downtown");

    const nameInput = screen.getByPlaceholderText(/Rahul Sharma/i);
    fireEvent.change(nameInput, { target: { value: "Dhinesh" } });

    const emailInput = screen.getByPlaceholderText(/rahul@example.com/i);
    fireEvent.change(emailInput, { target: { value: "dhinesh@example.com" } });

    const joinBtn = screen.getByRole("button", { name: /Join Shopping Session/i });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(joinSpy).toHaveBeenCalledWith(
        "session-abc-12345",
        "Dhinesh",
        "dhinesh@example.com"
      );
      expect(
        screen.getByText("Shopping Session Activated!")
      ).toBeInTheDocument();
    });
  });

  it("launches shopping when 'Start Scanning & Billing' button is clicked", async () => {
    const joinedSession: ShoppingSessionData = {
      ...mockActiveSession,
      joinedCustomerName: "Dhinesh",
      joinedAt: "2026-11-01T10:02:00.000Z",
    };

    vi.spyOn(sessionApi, "getSessionByCode").mockResolvedValue({
      success: true,
      data: { session: joinedSession },
    });

    const handleStartShopping = vi.fn();

    render(
      <JoinSessionPage
        sessionCode="session-abc-12345"
        onStartShopping={handleStartShopping}
      />
    );

    const startBtn = await screen.findByRole("button", {
      name: /Start Scanning & Billing/i,
    });
    fireEvent.click(startBtn);

    expect(handleStartShopping).toHaveBeenCalledWith(joinedSession);
  });

  it("calls onBackToWorker when return button is clicked", async () => {
    vi.spyOn(sessionApi, "getSessionByCode").mockResolvedValue({
      success: true,
      data: { session: mockActiveSession },
    });

    const handleBack = vi.fn();

    render(
      <JoinSessionPage
        sessionCode="session-abc-12345"
        onBackToWorker={handleBack}
      />
    );

    const backBtn = await screen.findByRole("button", {
      name: /Switch to POS Worker Terminal/i,
    });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
