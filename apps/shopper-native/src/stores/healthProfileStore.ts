/**
 * healthProfileStore — local source of truth for the user's health profile.
 *
 * Spec: HANDOFF.md §5.2.
 *
 * Holds four flat arrays (allergies, conditions, dependents, insurance) and
 * their CRUD actions. Architecture mirrors prescriptionsStore: Zustand for
 * instant reads, React Query mutations for network writes (see
 * src/features/health-profile, src/features/dependents, src/features/insurance).
 *
 * No existing useUserStore was found in the codebase (auth runs through a
 * React Context, not a persisted store), so this is a fresh v1 store —
 * no migration needed. When the next bump arrives, follow the migrate()
 * pattern documented inline below.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ──────────────────────────────────────────────────────────────────

export type AllergySeverity   = "mild" | "moderate" | "severe";
export type DependentRelation = "Spouse" | "Child" | "Parent" | "Sibling" | "Other";

export interface Allergy {
  id:       string;
  name:     string;
  severity: AllergySeverity;
  reaction: string;
  notes?:   string;
  addedAt:  string;
}

export interface Condition {
  id:       string;
  name:     string;
  since:    string;       // ISO date or year string ("2019")
  managed:  boolean;
  notes?:   string;
}

export interface Dependent {
  id:           string;
  name:         string;
  relationship: DependentRelation;
  dob:          string;   // ISO
  rxIds:        string[];
  colorHex?:    string;
}

export interface InsuranceCard {
  id:              string;
  carrier:         string;
  plan:            string;
  memberId:        string;
  groupNumber:     string;
  rxBin:           string;
  pcn:             string;
  copayGeneric:    number;
  copayBrand:      number;
  deductibleMet:   number;
  deductibleTotal: number;
  isPrimary:       boolean;
  addedAt:         string;
}

// ── Store shape ────────────────────────────────────────────────────────────

interface HealthProfileState {
  allergies:  Allergy[];
  conditions: Condition[];
  dependents: Dependent[];
  insurance:  InsuranceCard[];

  // Hydration (called by useHealthProfileQuery)
  hydrate: (input: {
    allergies:  Allergy[];
    conditions: Condition[];
    dependents: Dependent[];
    insurance:  InsuranceCard[];
  }) => void;

  // Mutations — optimistic; RQ writes through to Supabase
  addAllergy:    (a: Omit<Allergy,   "id" | "addedAt">) => Allergy;
  removeAllergy: (id: string) => void;

  addCondition:    (c: Omit<Condition, "id">) => Condition;
  removeCondition: (id: string) => void;

  addDependent:    (d: Omit<Dependent, "id" | "rxIds">) => Dependent;
  removeDependent: (id: string) => void;

  addInsurance:        (c: Omit<InsuranceCard, "id" | "addedAt">) => InsuranceCard;
  removeInsurance:     (id: string) => void;
  setPrimaryInsurance: (id: string) => void;

  reset: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const now = (): string => new Date().toISOString();
const uid = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

// ── Implementation ─────────────────────────────────────────────────────────

export const useHealthProfileStore = create<HealthProfileState>()(
  persist(
    (set) => ({
      allergies:  [],
      conditions: [],
      dependents: [],
      insurance:  [],

      hydrate: (input) =>
        set({
          allergies:  input.allergies,
          conditions: input.conditions,
          dependents: input.dependents,
          insurance:  input.insurance,
        }),

      addAllergy: (a) => {
        const rec: Allergy = { ...a, id: uid("al"), addedAt: now() };
        set((s) => ({ allergies: [...s.allergies, rec] }));
        return rec;
      },
      removeAllergy: (id) =>
        set((s) => ({ allergies: s.allergies.filter((a) => a.id !== id) })),

      addCondition: (c) => {
        const rec: Condition = { ...c, id: uid("co") };
        set((s) => ({ conditions: [...s.conditions, rec] }));
        return rec;
      },
      removeCondition: (id) =>
        set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) })),

      addDependent: (d) => {
        const rec: Dependent = { ...d, id: uid("dp"), rxIds: [] };
        set((s) => ({ dependents: [...s.dependents, rec] }));
        return rec;
      },
      removeDependent: (id) =>
        set((s) => ({ dependents: s.dependents.filter((d) => d.id !== id) })),

      addInsurance: (c) => {
        const rec: InsuranceCard = { ...c, id: uid("in"), addedAt: now() };
        set((s) => ({ insurance: [...s.insurance, rec] }));
        return rec;
      },
      removeInsurance: (id) =>
        set((s) => ({ insurance: s.insurance.filter((c) => c.id !== id) })),

      setPrimaryInsurance: (id) =>
        set((s) => ({
          insurance: s.insurance.map((c) => ({ ...c, isPrimary: c.id === id })),
        })),

      reset: () =>
        set({ allergies: [], conditions: [], dependents: [], insurance: [] }),
    }),
    {
      name:    "up.healthProfile",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 → v2: purge dev mock-seed records (ids prefixed "seed-") persisted
      // by the removed PharmacyBootstrap dev seeding. Fake allergies/conditions
      // are medically dangerous if mistaken for real user data.
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Pick<
          HealthProfileState, "allergies" | "conditions" | "dependents" | "insurance"
        >;
        if (fromVersion < 2 && state) {
          const noSeed = <T extends { id: string }>(arr: T[] | undefined): T[] =>
            (arr ?? []).filter((x) => !x.id.startsWith("seed-"));
          return {
            ...state,
            allergies:  noSeed(state.allergies),
            conditions: noSeed(state.conditions),
            dependents: noSeed(state.dependents),
            insurance:  noSeed(state.insurance),
          };
        }
        return state;
      },
      // Persist data only; functions are reattached on rehydrate.
      partialize: (state) => ({
        allergies:  state.allergies,
        conditions: state.conditions,
        dependents: state.dependents,
        insurance:  state.insurance,
      }),
      // Future migrations: when bumping version, add a migrate() here that
      // accepts the prior shape and defaults any new fields to safe values.
      // Never wipe — always preserve persistedState verbatim and merge.
      //
      // Example for v1 → v2 adding `vaccinations: Vaccination[]`:
      //
      //   migrate: (persistedState: any, fromVersion: number) => {
      //     if (fromVersion < 2) {
      //       return { ...persistedState, vaccinations: [] };
      //     }
      //     return persistedState;
      //   },
    },
  ),
);
