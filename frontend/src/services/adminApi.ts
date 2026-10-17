import { getAuthHeaders } from "./authApi";

const API_BASE_URL = "http://localhost:5000/api/v1";

export interface WorkerData {
  _id: string;
  name: string;
  email: string;
  role: "worker";
  status: "active" | "disabled";
  createdAt: string;
}

export interface DashboardSummary {
  totalUsers: number;
  totalWorkers: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: any[];
  activeSessions: number;
  completedOrders: number;
  totalRevenue: number;
}

export interface AuditLogData {
  _id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  timestamp: string;
}

export interface ResetDemoDataResult {
  deleted: {
    sessions: number;
    carts: number;
    orders: number;
    payments: number;
    auditLogs: number;
  };
}

export async function fetchAdminDashboard(): Promise<{
  summary: DashboardSummary;
  recentAuditLogs: AuditLogData[];
}> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to load admin dashboard");
  }
  return body.data;
}

export async function fetchWorkers(): Promise<WorkerData[]> {
  const response = await fetch(`${API_BASE_URL}/workers`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to load workers");
  }
  return body.data.workers;
}

export async function createWorker(
  name: string,
  email: string,
  password: string
): Promise<WorkerData> {
  const response = await fetch(`${API_BASE_URL}/workers`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to create worker");
  }
  return body.data.worker;
}

export async function toggleWorkerStatus(
  workerId: string,
  status: "active" | "disabled"
): Promise<WorkerData> {
  const response = await fetch(`${API_BASE_URL}/workers/${workerId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to update worker status");
  }
  return body.data.worker;
}

export async function createProductAdmin(productData: any): Promise<any> {
  const response = await fetch(`http://localhost:5000/api/products`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(productData),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to create product");
  }
  return body.data.product;
}

export async function updateProductAdmin(id: string, productData: any): Promise<any> {
  const response = await fetch(`http://localhost:5000/api/products/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(productData),
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to update product");
  }
  return body.data.product;
}

export async function resetDemoData(): Promise<ResetDemoDataResult> {
  const response = await fetch(`${API_BASE_URL}/admin/demo-data`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || body.message || "Failed to reset demo data");
  }
  return body.data;
}
