import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ORDERS_KEY = "um_orders_v1";

export interface OrderItem {
  productId: string;
  name:      string;
  price:     number;
  quantity:  number;
  imageUrl?: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id:        string;
  createdAt: string;
  items:     OrderItem[];
  subtotal:  number;
  delivery:  number;
  total:     number;
  address: {
    name:     string;
    phone:    string;
    city:     string;
    street:   string;
    building?: string;
    floor?:   string;
    notes?:   string;
  };
  status:    OrderStatus;
}

interface OrdersState {
  orders:      Order[];
  isHydrated:  boolean;
  hydrate:     () => Promise<void>;
  addOrder:    (order: Omit<Order, "id" | "createdAt" | "status">) => Order;
  clearOrders: () => void;
}

export const useOrderStore = create<OrdersState>((set, get) => ({
  orders:     [],
  isHydrated: false,

  hydrate: async () => {
    if (get().isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const orders = Array.isArray(parsed) ? (parsed as Order[]) : [];
        set({ orders, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  addOrder: (orderData) => {
    const order: Order = {
      ...orderData,
      id:        `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status:    "pending",
    };
    const orders = [order, ...get().orders];
    set({ orders });
    AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders)).catch(() => {});
    return order;
  },

  clearOrders: () => {
    set({ orders: [] });
    AsyncStorage.removeItem(ORDERS_KEY).catch(() => {});
  },
}));
