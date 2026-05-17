import { create } from "zustand";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "./api";
import type { Address, AddressFormData } from "./types";

interface AddressState {
  addresses: Address[];
  loading: boolean;
  error: string | null;

  fetch: (userId: string) => Promise<void>;
  add: (userId: string, form: AddressFormData) => Promise<Address>;
  update: (id: string, userId: string, form: Partial<AddressFormData>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string, userId: string) => Promise<void>;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  loading: false,
  error: null,

  fetch: async (userId) => {
    set({ loading: true, error: null });
    try {
      const addresses = await fetchAddresses(userId);
      set({ addresses, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  add: async (userId, form) => {
    // Optimistic: if setting as default, unset others locally
    if (form.is_default) {
      set((s) => ({
        addresses: s.addresses.map((a) => ({ ...a, is_default: false })),
      }));
    }
    const created = await createAddress(userId, form);
    set((s) => ({ addresses: [created, ...s.addresses] }));
    return created;
  },

  update: async (id, userId, form) => {
    // Optimistic update
    set((s) => ({
      addresses: s.addresses.map((a) => {
        if (a.id === id) return { ...a, ...form };
        if (form.is_default) return { ...a, is_default: false };
        return a;
      }),
    }));
    try {
      await updateAddress(id, userId, form);
    } catch {
      // Revert on failure
      await get().fetch(userId);
    }
  },

  remove: async (id) => {
    const prev = get().addresses;
    set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }));
    try {
      await deleteAddress(id);
    } catch {
      set({ addresses: prev });
    }
  },

  setDefault: async (id, userId) => {
    set((s) => ({
      addresses: s.addresses.map((a) => ({
        ...a,
        is_default: a.id === id,
      })),
    }));
    try {
      await setDefaultAddress(id, userId);
    } catch {
      await get().fetch(userId);
    }
  },
}));

export const selectDefaultAddress = (s: AddressState) =>
  s.addresses.find((a) => a.is_default) ?? null;
