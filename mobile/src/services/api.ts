/**
 * Axios instance with JWT interceptor for the Fresh Mart mobile app.
 * Reads the JWT token from expo-secure-store on every request.
 */
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

function withApiPrefix(baseUrl: string): string {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/+$/, "").replace(/(?:\/api)+$/, "");
  url.pathname = `${path}/api`;
  return url.toString().replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return withApiPrefix(configuredUrl);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const serverUrl = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`);
    return withApiPrefix(`http://${serverUrl.hostname}:5000`);
  }

  return withApiPrefix("http://localhost:5000");
}

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach JWT from SecureStore
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap { success, data } envelope
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.baseURL && error.config?.url
      ? `${error.config.baseURL.replace(/\/+$/, "")}/${error.config.url.replace(/^\/+/, "")}`
      : undefined;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error.message ||
      "Network error";
    const detail = error.response?.status === 404 && requestUrl
      ? `${message} (${error.config.method?.toUpperCase()} ${requestUrl})`
      : message;
    return Promise.reject(new Error(detail));
  }
);

export default api;
