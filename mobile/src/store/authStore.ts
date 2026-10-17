import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AuthUser } from "../types";

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
