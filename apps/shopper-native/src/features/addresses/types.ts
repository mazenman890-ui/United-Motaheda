export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressFormData = Omit<Address, "id" | "user_id" | "created_at" | "updated_at">;

export const ADDRESS_LABELS = [
  { key: "home",   labelKey: "address.labelHome",   icon: "home-outline"      },
  { key: "work",   labelKey: "address.labelWork",   icon: "briefcase-outline" },
  { key: "family", labelKey: "address.labelFamily", icon: "people-outline"    },
  { key: "other",  labelKey: "address.labelOther",  icon: "location-outline"  },
] as const;

export type AddressLabel = (typeof ADDRESS_LABELS)[number]["key"];
