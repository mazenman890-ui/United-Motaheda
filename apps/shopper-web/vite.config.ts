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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("@heroicons")) return "heroicons";
          if (id.includes("recharts")) return "charts";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@mui")) return "mui";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("motion")) return "motion";
          return undefined;
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
