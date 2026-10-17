const API_BASE = "http://localhost:5000/api/v1";

export interface InventoryAlertData {
  _id: string;
  productId: string;
  productName: string;
  barcode: string;
  storeId?: string;
  reorderLevel: number;
  currentQty: number;
  lastAlertedAt?: string;
  alertEnabled: boolean;
}

export interface StockReportItem {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  stockQty: number;
  reorderLevel: number;
  storeId?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || json.error?.message || "Request failed");
  return json.data as T;
}

export async function getInventoryAlerts(storeId?: string): Promise<InventoryAlertData[]> {
  const path = storeId
    ? `/inventory/alerts/${storeId}`
    : `/inventory/alerts`;
  return apiFetch<InventoryAlertData[]>(path);
}

export async function getStockReport(storeId?: string): Promise<StockReportItem[]> {
  const query = storeId ? `?storeId=${storeId}` : "";
  return apiFetch<StockReportItem[]>(`/inventory/stock-report${query}`);
}

export async function setReorderThreshold(productId: string, reorderLevel: number): Promise<void> {
  await apiFetch(`/inventory/${productId}/threshold`, {
    method: "PATCH",
    body: JSON.stringify({ reorderLevel }),
  });
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiFetch(`/inventory/alerts/${alertId}/acknowledge`, { method: "POST" });
}
