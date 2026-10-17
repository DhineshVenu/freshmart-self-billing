const API_BASE = "http://localhost:5000/api/v1";

export interface DailySnapshotData {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  peakHour: number;
}

export interface CategoryReportItem {
  category: string;
  revenue: number;
  orders: number;
}

export interface PeakHourItem {
  hour: number;
  orderCount: number;
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

export async function getDailyReport(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<DailySnapshotData[]> {
  const params = new URLSearchParams({ startDate, endDate });
  if (storeId) params.set("storeId", storeId);
  return apiFetch<DailySnapshotData[]>(`/reports/daily?${params}`);
}

export async function getCategoryReport(
  period: "week" | "month" | "quarter",
  storeId?: string
): Promise<CategoryReportItem[]> {
  const params = new URLSearchParams({ period });
  if (storeId) params.set("storeId", storeId);
  return apiFetch<CategoryReportItem[]>(`/reports/category?${params}`);
}

export async function getPeakHourReport(
  period: "week" | "month" | "quarter",
  storeId?: string
): Promise<PeakHourItem[]> {
  const params = new URLSearchParams({ period });
  if (storeId) params.set("storeId", storeId);
  return apiFetch<PeakHourItem[]>(`/reports/peak-hours?${params}`);
}

export async function exportCsv(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<Blob> {
  const params = new URLSearchParams({ startDate, endDate });
  if (storeId) params.set("storeId", storeId);
  const res = await fetch(`${API_BASE}/reports/export/csv?${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message || "CSV export failed");
  }
  return res.blob();
}
