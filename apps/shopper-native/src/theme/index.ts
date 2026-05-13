export const colors = {
  brand: {
    50:  "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  amber: {
    50:  "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  slate: {
    50:  "#f8fafc",
    100: "#f1f5f9",
    150: "#eaeff5",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  bg:      "#f0f4f8",
  white:   "#ffffff",
  black:   "#000000",
  error:   "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
} as const;

export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

export const radius = {
  xs:    4,
  sm:    6,
  md:    10,
  lg:    14,
  xl:    18,
  "2xl": 22,
  "3xl": 28,
  full:  9999,
} as const;

export const fontSize = {
  xs:    11,
  sm:    12,
  base:  14,
  md:    15,
  lg:    16,
  xl:    18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
  "5xl": 32,
} as const;

export const fontWeight = {
  normal:    "400" as const,
  medium:    "500" as const,
  semibold:  "600" as const,
  bold:      "700" as const,
  extrabold: "800" as const,
  black:     "900" as const,
};

export const shadow = {
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

export const catGradients: [string, string][] = [
  ["#f97316", "#ea580c"],
  ["#8b5cf6", "#7c3aed"],
  ["#ec4899", "#db2777"],
  ["#059669", "#047857"],
  ["#3b82f6", "#2563eb"],
  ["#10b981", "#059669"],
  ["#f59e0b", "#d97706"],
  ["#06b6d4", "#0891b2"],
  ["#84cc16", "#65a30d"],
  ["#6366f1", "#4f46e5"],
];

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow, catGradients };
export default theme;
