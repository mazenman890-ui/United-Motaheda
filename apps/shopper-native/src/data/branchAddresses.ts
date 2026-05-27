/**
 * Static branch addresses for display cards (about, contact, etc.).
 * Distinct from delivery Branch selectors — read-only marketing copy.
 */

export interface BranchAddress {
  title: string;
  address: string;
}

export const BRANCH_ADDRESSES: readonly BranchAddress[] = [
  {
    title: "United Pharmacies - Gardenia",
    address: "Gardenia, New Cairo, Cairo",
  },
  {
    title: "United Pharmacies - Palestine Street",
    address: "1 Palestine Rd, El-Basatin Sharkeya, Maadi, Cairo",
  },
  {
    title: "United Pharmacies - Al Hay Al Asher",
    address: "Al Hay Al Asher, Nasr City, Cairo",
  },
  {
    title: "United Pharmacies - Zahraa El Gomhoureya",
    address: "El Gomhoureya St. #14, Zahraa Nasr City, Cairo",
  },
  {
    title: "United Pharmacies - Nasr City (Fatma El-Zahraa Rd.)",
    address: "Fatma El-Zahraa Rd, Al Hay Al Asher, Nasr City, Cairo",
  },
] as const;
