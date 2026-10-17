import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShoppingSession } from "../types";

const SESSION_KEY = "active_session";

interface SessionState {
  session: ShoppingSession | null;
  setSession: (session: ShoppingSession) => Promise<void>;
  clearSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,

  setSession: async (session) => {
    set({ session });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSession: async () => {
    set({ session: null });
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  restoreSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as ShoppingSession;
        // Only restore ACTIVE or CHECKOUT_PENDING sessions
        if (session.status === "ACTIVE" || session.status === "CHECKOUT_PENDING") {
          set({ session });
        }
      }
    } catch {
      // Non-fatal
    }
  },
}));
