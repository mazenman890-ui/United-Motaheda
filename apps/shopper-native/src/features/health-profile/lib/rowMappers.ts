/**
 * Supabase row ↔ store-shape mappers for the health-profile slice.
 */

import type {
  Allergy,
  Condition,
  Dependent,
  InsuranceCard,
  AllergySeverity,
  DependentRelation,
} from "@/stores/healthProfileStore";

const centsToUnits = (cents: number | null): number => (cents ?? 0) / 100;

// ── Allergy ────────────────────────────────────────────────────────────────

export interface AllergyRow {
  id:       string;
  user_id:  string;
  name:     string;
  severity: AllergySeverity;
  reaction: string | null;
  notes:    string | null;
  added_at: string;
}

export function rowToAllergy(row: AllergyRow): Allergy {
  return {
    id:       row.id,
    name:     row.name,
    severity: row.severity,
    reaction: row.reaction ?? "",
    notes:    row.notes ?? undefined,
    addedAt:  row.added_at,
  };
}

// ── Condition ──────────────────────────────────────────────────────────────

export interface ConditionRow {
  id:       string;
  user_id:  string;
  name:     string;
  since:    string | null;
  managed:  boolean;
  notes:    string | null;
  added_at: string;
}

export function rowToCondition(row: ConditionRow): Condition {
  return {
    id:      row.id,
    name:    row.name,
    since:   row.since ?? "",
    managed: row.managed,
    notes:   row.notes ?? undefined,
  };
}

// ── Dependent ──────────────────────────────────────────────────────────────

export interface DependentRow {
  id:           string;
  user_id:      string;
  name:         string;
  relationship: DependentRelation;
  dob:          string;
  color_hex:    string | null;
  created_at:   string;
}

export function rowToDependent(row: DependentRow): Dependent {
  return {
    id:           row.id,
    name:         row.name,
    relationship: row.relationship,
    dob:          row.dob,
    rxIds:        [],
    colorHex:     row.color_hex ?? undefined,
  };
}

// ── Insurance ──────────────────────────────────────────────────────────────

export interface InsuranceCardRow {
  id:                     string;
  user_id:                string;
  carrier:                string;
  plan:                   string | null;
  member_id:              string;
  group_number:           string | null;
  rx_bin:                 string | null;
  pcn:                    string | null;
  copay_generic_cents:    number | null;
  copay_brand_cents:      number | null;
  deductible_met_cents:   number;
  deductible_total_cents: number | null;
  is_primary:             boolean;
  added_at:               string;
}

export function rowToInsuranceCard(row: InsuranceCardRow): InsuranceCard {
  return {
    id:              row.id,
    carrier:         row.carrier,
    plan:            row.plan         ?? "",
    memberId:        row.member_id,
    groupNumber:     row.group_number ?? "",
    rxBin:           row.rx_bin       ?? "",
    pcn:             row.pcn          ?? "",
    copayGeneric:    centsToUnits(row.copay_generic_cents),
    copayBrand:      centsToUnits(row.copay_brand_cents),
    deductibleMet:   centsToUnits(row.deductible_met_cents),
    deductibleTotal: centsToUnits(row.deductible_total_cents),
    isPrimary:       row.is_primary,
    addedAt:         row.added_at,
  };
}
