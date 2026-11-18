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

/**
 * DELETE /sessions/:code — cancel an active shopping session.
 * Uses the authenticated axios client (worker/admin/customer token is injected).
 */
export async function cancelSession(code: string): Promise<void> {
  await api.delete(`/sessions/${code}`);
}
