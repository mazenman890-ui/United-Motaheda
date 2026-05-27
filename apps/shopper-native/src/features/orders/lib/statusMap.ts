/**
 * mapOrderStatus — translate the project's existing OrderStatus enum into the
 * HANDOFF §10.2 presentational tone map.
 *
 * The store enum (pending/processing/shipped/delivered/cancelled) stays the
 * source of truth. HANDOFF tones are presentational only — use this helper
 * any time a component needs a SPEC-aligned color/icon/label triple for an
 * order.
 */

import type { OrderStatus } from "@/stores/orders";

/** SPEC §10.2 tone set used by Badge / OrderStatusPill. */
export type OrderTone = "success" | "info" | "warning" | "error" | "brand" | "neutral";

export interface OrderStatusView {
  tone:  OrderTone;
  icon:  "checkmark-circle" | "car" | "cube" | "medkit" | "close-circle" | "time" | "refresh";
  /** Arabic label, ready to render. */
  label: string;
}

const MAP: Record<OrderStatus, OrderStatusView> = {
  // store: 'pending'    → HANDOFF: awaiting   → warn
  pending:          { tone: "warning", icon: "time",              label: "قيد المعالجة" },
  pending_payment:  { tone: "warning", icon: "time",              label: "بانتظار تأكيد الدفع" },
  // store: 'processing' → HANDOFF: preparing  → warn
  processing: { tone: "warning", icon: "refresh",           label: "جارٍ التجهيز" },
  // store: 'shipped'    → HANDOFF: in_transit → info
  shipped:    { tone: "info",    icon: "car",               label: "في الطريق"    },
  // store: 'delivered'  → HANDOFF: delivered  → success
  delivered:  { tone: "success", icon: "checkmark-circle",  label: "تم التسليم"   },
  // store: 'cancelled'  → HANDOFF: cancelled  → danger
  cancelled:  { tone: "error",   icon: "close-circle",      label: "ملغي"         },
};

export function mapOrderStatus(status: OrderStatus): OrderStatusView {
  return MAP[status];
}
