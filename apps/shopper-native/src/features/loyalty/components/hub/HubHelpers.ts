/**
 * Pure helpers for the Loyalty Hub UI.
 * No React — safe to import in worklets or plain TS modules.
 */

import { theme } from "@/shared/theme";
import type { Ionicons } from "@expo/vector-icons";
import type React from "react";
import type { LedgerEntry } from "../../types";

export type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
type TFunc = (key: string, opts?: Record<string, unknown>) => string;

// ─── Tier colour / icon mapping ───────────────────────────────────────────────

export function getTierColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "#E5E4E2";
  if (n.includes("ذهب")   || n.includes("gold")) return theme.colors.amber[500];
  if (n.includes("فضي")   || n.includes("silv")) return theme.colors.slate[400];
  return "#CD7F32"; // bronze default
}

export function getTierIcon(name: string): IoniconsName {
  const n = name.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "diamond-outline";
  if (n.includes("ذهب")   || n.includes("gold")) return "trophy-outline";
  if (n.includes("فضي")   || n.includes("silv")) return "medal-outline";
  return "star-outline";
}

// ─── Ledger entry display ──────────────────────────────────────────────────────

export function getLedgerIcon(kind: LedgerEntry["kind"]): IoniconsName {
  switch (kind) {
    case "earn":     return "add-circle-outline";
    case "redeem":   return "remove-circle-outline";
    case "bonus":    return "gift-outline";
    case "referral": return "people-outline";
    case "cashback": return "cash-outline";
    case "expire":   return "time-outline";
    case "adjust":   return "build-outline";
    case "reverse":  return "refresh-outline";
    default:         return "ellipse-outline";
  }
}

export function getLedgerLabel(
  kind: LedgerEntry["kind"],
  source: string,
  t: TFunc,
): string {
  switch (kind) {
    case "earn":     return t("loyalty.ledgerKindEarnSource", { source });
    case "redeem":   return t("loyalty.ledgerKindRedeem");
    case "bonus":    return t("loyalty.ledgerKindBonus");
    case "referral": return t("loyalty.ledgerKindReferral");
    case "cashback": return t("loyalty.ledgerKindCashback");
    case "expire":   return t("loyalty.ledgerKindExpire");
    case "adjust":   return t("loyalty.ledgerKindAdjust");
    case "reverse":  return t("loyalty.ledgerKindReverse");
    default:         return source;
  }
}
