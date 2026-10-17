import api from "./api";
import { ShoppingSession } from "../types";

export async function getSessionByCode(code: string): Promise<ShoppingSession> {
  const res = await api.get<{ success: boolean; data: { session: ShoppingSession } }>(
    `/sessions/${code}`
  );
  return res.data.data.session;
}

export async function joinSession(
  code: string,
  customerName: string,
  customerEmail?: string
): Promise<ShoppingSession> {
  const res = await api.post<{ success: boolean; data: { session: ShoppingSession } }>(
    `/sessions/${code}/join`,
    { customerName, customerEmail }
  );
  return res.data.data.session;
}
