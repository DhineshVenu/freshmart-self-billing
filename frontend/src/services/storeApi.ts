const API_BASE = "http://localhost:5000/api/v1";

export interface StoreData {
  _id: string;
  name: string;
  address: string;
  city: string;
  gstNumber: string;
  managerId?: string;
  managerName?: string;
  active: boolean;
  createdAt: string;
}

export interface StoreKPIs {
  todayRevenue: number;
  totalOrders: number;
  activeSessionCount: number;
  lowStockCount: number;
}

export interface CreateStorePayload {
  name: string;
  address: string;
  city: string;
  gstNumber: string;
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

export async function getAllStores(): Promise<StoreData[]> {
  return apiFetch<StoreData[]>("/stores");
}

export async function createStore(payload: CreateStorePayload): Promise<StoreData> {
  return apiFetch<StoreData>("/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStore(storeId: string, payload: Partial<CreateStorePayload>): Promise<StoreData> {
  return apiFetch<StoreData>(`/stores/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function toggleStoreActive(storeId: string, active: boolean): Promise<StoreData> {
  return apiFetch<StoreData>(`/stores/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function getStoreKPIs(storeId: string): Promise<StoreKPIs> {
  return apiFetch<StoreKPIs>(`/stores/${storeId}/kpis`);
}

export async function assignManager(storeId: string, managerId: string): Promise<StoreData> {
  return apiFetch<StoreData>(`/stores/${storeId}/assign-manager`, {
    method: "POST",
    body: JSON.stringify({ managerId }),
  });
}
