/**
 * mapOrderStatus — translate the project's existing OrderStatus enum into the
 * HANDOFF §10.2 presentational tone map.
 *
 * The store enum (pending/processing/shipped/delivered/cancelled) stays the
 * source of truth. HANDOFF tones are presentational only — use this helper
 * any time a component needs a SPEC-aligned color/icon/label triple for an
 * order.
 */

import type { TFunction } from "i18next";
import type { OrderStatus } from "@/stores/orders";

/** SPEC §10.2 tone set used by Badge / OrderStatusPill. */
export type OrderTone = "success" | "info" | "warning" | "error" | "brand" | "neutral";

export interface OrderStatusView {
  tone:     OrderTone;
  icon:     "checkmark-circle" | "car" | "cube" | "medkit" | "close-circle" | "time" | "refresh";
  /** Localised label — pass `t` to `mapOrderStatus` to compute. */
  label:    string;
}

type StatusBase = { tone: OrderTone; icon: OrderStatusView["icon"]; labelKey: string };

const MAP: Record<OrderStatus, StatusBase> = {
  // store: 'pending'    → HANDOFF: awaiting   → warn
  pending:         { tone: "warning", icon: "time",             labelKey: "orderStatus.pending"        },
  pending_payment: { tone: "warning", icon: "time",             labelKey: "orderStatus.pendingPayment" },
  // store: 'processing' → HANDOFF: preparing  → warn
  processing:      { tone: "warning", icon: "refresh",          labelKey: "orderStatus.processing"     },
  // store: 'shipped'    → HANDOFF: in_transit → info
  shipped:         { tone: "info",    icon: "car",              labelKey: "orderStatus.shipped"        },
  // store: 'delivered'  → HANDOFF: delivered  → success
  delivered:       { tone: "success", icon: "checkmark-circle", labelKey: "orderStatus.delivered"      },
  // store: 'cancelled'  → HANDOFF: cancelled  → danger
  cancelled:       { tone: "error",   icon: "close-circle",     labelKey: "orderStatus.cancelled"      },
};

export function mapOrderStatus(status: OrderStatus, t: TFunction): OrderStatusView {
  const base = MAP[status];
  return { tone: base.tone, icon: base.icon, label: t(base.labelKey) };
}
