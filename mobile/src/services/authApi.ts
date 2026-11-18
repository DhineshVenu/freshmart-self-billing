import api from "./api";
import { AuthUser, CustomerProfile, RedeemBountyResult } from "../types";

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export async function loginUser(payload: LoginPayload): Promise<{ user: AuthUser; token: string }> {
  const res = await api.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
    "/v1/auth/login",
    payload
  );
  return res.data.data;
}

export async function registerUser(payload: RegisterPayload): Promise<{ user: AuthUser; token: string }> {
  const res = await api.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
    "/v1/auth/register",
    payload
  );
  return res.data.data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await api.get<{ success: boolean; data: { user: AuthUser } }>("/v1/auth/me");
  return res.data.data.user;
}

/** Full profile including loyalty bounty points and wallet balance. */
export async function getProfile(): Promise<CustomerProfile> {
  const res = await api.get<{ success: boolean; data: { profile: CustomerProfile } }>(
    "/v1/auth/profile"
  );
  return res.data.data.profile;
}

/** Redeem Fresh Points for wallet credit (customer only). */
export async function redeemBounty(pointsToRedeem: number): Promise<RedeemBountyResult> {
  const res = await api.post<{ success: boolean; data: RedeemBountyResult }>(
    "/v1/auth/redeem-bounty",
    { pointsToRedeem }
  );
  return res.data.data;
}

export async function logoutUser(): Promise<void> {
  await api.post("/v1/auth/logout");
}

export async function forgotPassword(email: string): Promise<{ message: string; otp?: string }> {
  const res = await api.post<{ success: boolean; data: { message: string; otp?: string } }>(
    "/v1/auth/forgot-password",
    { email }
  );
  return res.data.data;
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post<{ success: boolean; data: { message: string } }>(
    "/v1/auth/reset-password",
    { email, otp, newPassword }
  );
  return res.data.data;
}
