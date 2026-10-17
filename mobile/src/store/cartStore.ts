import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Cart, CartItem } from "../types";

export interface CartMutation {
  type: "ADD" | "UPDATE" | "REMOVE";
  sessionCode: string;
  barcode?: string;
  productId?: string;
  quantity?: number;
  timestamp: number;
}

interface CartState {
  cart: Cart | null;
  pendingMutations: CartMutation[];
  isSyncing: boolean;
  setCart: (cart: Cart) => void;
  clearCart: () => void;
  queueMutation: (mutation: CartMutation) => Promise<void>;
  flushMutations: (processor: (m: CartMutation) => Promise<Cart>) => Promise<void>;
  getItemCount: () => number;
  getSubtotal: () => number;
}

const CART_QUEUE_KEY = "cart_pending_mutations";
const CART_DATA_KEY = "cart_data";

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  pendingMutations: [],
  isSyncing: false,

  setCart: (cart) => {
    set({ cart });
    // Persist to AsyncStorage for offline resilience
    AsyncStorage.setItem(CART_DATA_KEY, JSON.stringify(cart)).catch(() => {});
  },

  clearCart: () => {
    set({ cart: null, pendingMutations: [] });
    AsyncStorage.multiRemove([CART_DATA_KEY, CART_QUEUE_KEY]).catch(() => {});
  },

  queueMutation: async (mutation) => {
    const updated = [...get().pendingMutations, mutation];
    set({ pendingMutations: updated });
    await AsyncStorage.setItem(CART_QUEUE_KEY, JSON.stringify(updated));
  },

  flushMutations: async (processor) => {
    const mutations = get().pendingMutations;
    if (mutations.length === 0) return;

    set({ isSyncing: true });
    const remaining: CartMutation[] = [];

    for (const mutation of mutations) {
      try {
        const updatedCart = await processor(mutation);
        set({ cart: updatedCart });
      } catch {
        remaining.push(mutation); // Keep failed mutations for retry
      }
    }

    set({ pendingMutations: remaining, isSyncing: false });
    await AsyncStorage.setItem(CART_QUEUE_KEY, JSON.stringify(remaining));
  },

  getItemCount: () => {
    return get().cart?.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) ?? 0;
  },

  getSubtotal: () => get().cart?.subtotal ?? 0,
}));

// Restore persisted cart on app launch
export async function restoreCartFromStorage(): Promise<void> {
  try {
    const [cartRaw, queueRaw] = await AsyncStorage.multiGet([CART_DATA_KEY, CART_QUEUE_KEY]);
    const cartData = cartRaw[1] ? JSON.parse(cartRaw[1]) as Cart : null;
    const queueData = queueRaw[1] ? JSON.parse(queueRaw[1]) as CartMutation[] : [];
    useCartStore.setState({ cart: cartData, pendingMutations: queueData });
  } catch {
    // Non-fatal
  }
}
