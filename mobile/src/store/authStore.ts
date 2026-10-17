import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AuthUser } from "../types";

function decodeBase64(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/=+$/, "");
  let output = "";
  if (str.length % 4 === 1) return "";
  for (
    let bc = 0, bs = 0, buffer = 0, idx = 0;
    (buffer = chars.indexOf(str.charAt(idx++))), ~buffer;
  ) {
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const decoded = typeof atob === "function" ? atob(base64) : decodeBase64(base64);
    const payload = JSON.parse(decoded);
    if (!payload.exp) return false;
    // Buffer of 60 seconds before expiration
    return Date.now() >= (payload.exp - 60) * 1000;
  } catch {
    return true;
  }
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  restoreAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync("auth_token", token);
    await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("auth_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const userRaw = await SecureStore.getItemAsync("auth_user");

      if (token && userRaw) {
        if (isJwtExpired(token)) {
          // Token is expired, purge it cleanly
          await SecureStore.deleteItemAsync("auth_token");
          await SecureStore.deleteItemAsync("auth_user");
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }

        const user = JSON.parse(userRaw) as AuthUser;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
