import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
      "@pharmacy/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@pharmacy/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
      "@pharmacy/contracts/": path.resolve(__dirname, "../../packages/contracts/src/"),
      "@pharmacy/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
      "@pharmacy/domain-core": path.resolve(__dirname, "../../packages/domain-core/src/index.ts"),
      "@pharmacy/domain-search": path.resolve(__dirname, "../../packages/domain-search/src/index.ts"),
      "@pharmacy/domain-catalog": path.resolve(__dirname, "../../packages/domain-catalog/src/index.ts"),
      "@pharmacy/domain-location": path.resolve(__dirname, "../../packages/domain-location/src/index.ts"),
      "@pharmacy/domain-cart": path.resolve(__dirname, "../../packages/domain-cart/src/index.ts"),
      "@pharmacy/domain-checkout": path.resolve(__dirname, "../../packages/domain-checkout/src/index.ts"),
      "@pharmacy/domain-orders": path.resolve(__dirname, "../../packages/domain-orders/src/index.ts"),
      "@pharmacy/domain-prescriptions": path.resolve(__dirname, "../../packages/domain-prescriptions/src/index.ts"),
      "@pharmacy/domain-account": path.resolve(__dirname, "../../packages/domain-account/src/index.ts"),
      "@pharmacy/domain-ops": path.resolve(__dirname, "../../packages/domain-ops/src/index.ts"),
      "@pharmacy/domain-courier": path.resolve(__dirname, "../../packages/domain-courier/src/index.ts"),
      "@pharmacy/ui-web": path.resolve(__dirname, "../../packages/ui-web/src/index.ts"),
      "@pharmacy/ui-native": path.resolve(__dirname, "../../packages/ui-native/src/index.ts"),
      "@pharmacy/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../../"),
        path.resolve(__dirname, "../../packages"),
      ],
    },
  },
  optimizeDeps: {
    include: [
      "@pharmacy/contracts",
      "@pharmacy/api-client"
    ]
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // React ecosystem (core only, no deps that import React)
          if (id.includes("react") || id.includes("scheduler") || id.includes("use-sync-external-store")) {
            return "react-core";
          }
          // React DOM - separate to avoid circular
          if (id.includes("react-dom") || id.includes("react-refresh")) {
            return "react-dom";
          }
          // Routing (may import React, but not vice versa in circular way)
          if (id.includes("react-router") || id.includes("@remix-run") || id.includes("history")) {
            return "router";
          }
          // Animation (imports React)
          if (id.includes("framer-motion") || id.includes("motion")) {
            return "motion";
          }
          // UI libraries
          if (id.includes("@radix-ui")) return "ui-libs";
          if (id.includes("@mui")) return "mui";
          // Icons (should be standalone)
          if (id.includes("lucide-react") || id.includes("@heroicons") || id.includes("lucide")) {
            return "icons";
          }
          // Charts (large, standalone)
          if (id.includes("recharts") || id.includes("d3") || id.includes("victory")) {
            return "charts";
          }
          // Utilities (small, standalone)
          if (id.includes("lodash") || id.includes("date-fns") || id.includes("dayjs") || id.includes("clsx") || id.includes("tailwind-merge")) {
            return "utils";
          }
          // Data layer (may import React context)
          if (id.includes("@supabase") || id.includes("@tanstack") || id.includes("swr")) {
            return "data";
          }
          // State management
          if (id.includes("zustand") || id.includes("jotai") || id.includes("zustand/vanilla")) {
            return "state";
          }
          // Forms (imports React)
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) {
            return "forms";
          }
          // Large standalone libs
          if (id.includes("pdf-lib")) return "pdf";
          if (id.includes("xlsx")) return "excel";
          if (id.includes("jsqr")) return "qr";
          if (id.includes("leaflet") || id.includes("react-leaflet")) return "maps";
          // Let remaining deps be bundled with their consumers (no catch-all)
          return undefined;
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
