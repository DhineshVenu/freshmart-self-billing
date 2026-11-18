const API_BASE_URL = "http://localhost:5000/api/v1";

export interface UserProfile {
  userId: string;
  email: string;
  role: "customer" | "worker" | "admin" | "store_manager";
  name: string;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem("auth_token");
}

export function getStoredUser(): UserProfile | null {
  const saved = sessionStorage.getItem("auth_user");
  return saved ? JSON.parse(saved) : null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginUser(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Login failed");
  }

  const { user, token } = body.data;
  sessionStorage.setItem("auth_token", token);
  sessionStorage.setItem("auth_user", JSON.stringify(user));
  return { user, token };
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
  } finally {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
  }
}

/** Full customer profile including loyalty bounty points and wallet balance. */
export interface CustomerProfile {
  name: string;
  email: string;
  role: string;
  phone: string;
  dietaryPreferences: { allergens: string[]; diet: string[] };
  bountyPoints: number;
  bountyWalletBalance: number;
}

/** GET /api/v1/auth/profile — full profile including bounty + dietary prefs. */
export async function getProfile(): Promise<CustomerProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || "Failed to load profile");
  }
  return json.data.profile as CustomerProfile;
}

export interface RedeemBountyResult {
  bountyPoints: number;
  bountyWalletBalance: number;
  redeemed: number;
  walletDebit: number;
}

/** POST /api/v1/auth/redeem-bounty — redeem Fresh Points for wallet credit (customer only). */
export async function redeemBounty(pointsToRedeem: number): Promise<RedeemBountyResult> {
  const res = await fetch(`${API_BASE_URL}/auth/redeem-bounty`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ pointsToRedeem }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || "Failed to redeem bounty");
  }
  return json.data as RedeemBountyResult;
}
