export type PaymentMethodType = "cod" | "instapay" | "vodafone_cash";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  description: string;
  icon: string;
  is_active: boolean;
  details?: string;
  phone?: string;
}

export interface PaymentState {
  selected: PaymentMethodType;
  methods: PaymentMethod[];
  loading: boolean;
  setSelected: (type: PaymentMethodType) => void;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    type: "cod",
    label: "الدفع عند الاستلام",
    description: "ادفع نقداً عند استلام طلبك",
    icon: "cash-outline",
    is_active: true,
    details: "يتم الدفع للمندوب مباشرة",
  },
  {
    id: "instapay",
    type: "instapay",
    label: "InstaPay",
    description: "تحويل فوري عبر إنستاباي",
    icon: "flash-outline",
    is_active: true,
    phone: "01XXXXXXXXX",
    details: "حوّل المبلغ وأرسل لنا صورة الإيصال",
  },
  {
    id: "vodafone_cash",
    type: "vodafone_cash",
    label: "فودافون كاش",
    description: "ادفع من محفظتك الإلكترونية",
    icon: "wallet-outline",
    is_active: true,
    phone: "01XXXXXXXXX",
    details: "حوّل لرقم المحفظة وأرسل الإيصال",
  },
];
