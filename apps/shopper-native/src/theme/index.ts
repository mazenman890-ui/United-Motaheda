export const colors = {
  brand: {
    50:  "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#083344",
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

  // App surfaces
  bg:      "#F0F9FC",
  surface: "#FFFFFF",
  muted:   "#F6FBFD",

  // Hero depths (deep teal-navy)
  hero:       "#021D2E",
  heroMid:    "#053348",
  heroBright: "#0A4A65",

  // Semantic
  error:   "#DC2626",
  warning: "#D97706",
  success: "#0f766e",
  info:    "#0891b2",

  // Utility
  white:  "#FFFFFF",
  black:  "#000000",
  border: "rgba(0,0,0,0.06)",
  glass:  "rgba(255,255,255,0.12)",
  glassBorder: "rgba(255,255,255,0.22)",
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
  "5xl": 34,
} as const;

export const fontWeight = {
  normal:    "400" as const,
  medium:    "500" as const,
  semibold:  "600" as const,
  bold:      "700" as const,
  extrabold: "800" as const,
  black:     "900" as const,
};

export const fonts = {
  regular:   "Cairo_400Regular",
  semibold:  "Cairo_600SemiBold",
  bold:      "Cairo_700Bold",
  extrabold: "Cairo_800ExtraBold",
  black:     "Cairo_900Black",
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  brand: {
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  float: {
    shadowColor: "#021D2E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
  },
} as const;

export const catGradients: [string, string][] = [
  ["#0891b2", "#0e7490"],
  ["#7C3AED", "#6D28D9"],
  ["#0284C7", "#0369A1"],
  ["#DC2626", "#B91C1C"],
  ["#D97706", "#B45309"],
  ["#06b6d4", "#0891b2"],
  ["#0d9488", "#0f766e"],
  ["#DB2777", "#BE185D"],
  ["#2563EB", "#1D4ED8"],
  ["#9333EA", "#7E22CE"],
];

export const theme = { colors, spacing, radius, fontSize, fontWeight, fonts, shadow, catGradients };
export default theme;
