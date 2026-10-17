import api from "./api";
import { AuthUser } from "../types";

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

export async function logoutUser(): Promise<void> {
  await api.post("/v1/auth/logout");
}
