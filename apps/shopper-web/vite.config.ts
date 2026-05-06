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
      "@pharmacy/types": path.resolve(__dirname, "../../packages/types/src"),
      "@pharmacy/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@pharmacy/domain-core": path.resolve(__dirname, "../../packages/domain-core/src"),
      "@pharmacy/domain-search": path.resolve(__dirname, "../../packages/domain-search/src"),
      "@pharmacy/domain-catalog": path.resolve(__dirname, "../../packages/domain-catalog/src"),
      "@pharmacy/domain-location": path.resolve(__dirname, "../../packages/domain-location/src"),
      "@pharmacy/domain-cart": path.resolve(__dirname, "../../packages/domain-cart/src"),
      "@pharmacy/domain-checkout": path.resolve(__dirname, "../../packages/domain-checkout/src"),
      "@pharmacy/domain-orders": path.resolve(__dirname, "../../packages/domain-orders/src"),
      "@pharmacy/domain-prescriptions": path.resolve(__dirname, "../../packages/domain-prescriptions/src"),
      "@pharmacy/domain-account": path.resolve(__dirname, "../../packages/domain-account/src"),
      "@pharmacy/domain-ops": path.resolve(__dirname, "../../packages/domain-ops/src"),
      "@pharmacy/domain-courier": path.resolve(__dirname, "../../packages/domain-courier/src"),
      "@pharmacy/ui-web": path.resolve(__dirname, "../../packages/ui-web/src"),
      "@pharmacy/ui-native": path.resolve(__dirname, "../../packages/ui-native/src"),
      "@pharmacy/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src"),
    },
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
