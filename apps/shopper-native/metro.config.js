const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ─── Web bundle: avoid ESM variants that ship `import.meta` ──────────────────
//
// Zustand (and similar libs with dual exports) publish:
//   { "import": "./esm/*.mjs",  "default": "./*.js" }
// Metro's web target prefers the "import" condition, pulling the .mjs build
// which contains `import.meta.env` — invalid outside <script type="module">.
//
// Two-layer defense:
//   1. Tell the resolver to skip the "import" condition on web so it falls
//      through to "default" (CommonJS).
//   2. As a hard backstop, intercept any resolution of `zustand/*` paths
//      ending in `.mjs` and rewrite to the matching `.js` file. This catches
//      cases where condition-based resolution is bypassed (e.g., deep
//      requires that resolve via internal paths).
//
// Native is unaffected — it resolves via the "react-native" condition which
// already points at the CJS build, and the resolveRequest branch checks for
// platform === "web" before rewriting.

config.resolver.unstable_conditionsByPlatform = {
  ...(config.resolver.unstable_conditionsByPlatform ?? {}),
  web: ["browser"],
};

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    // Force zustand to its CJS build on web regardless of condition matching.
    if (moduleName === "zustand")              moduleName = "zustand/index.js";
    else if (moduleName === "zustand/middleware") moduleName = "zustand/middleware.js";
    else if (moduleName === "zustand/shallow")    moduleName = "zustand/shallow.js";
    else if (moduleName === "zustand/vanilla")    moduleName = "zustand/vanilla.js";
    else if (moduleName === "zustand/traditional") moduleName = "zustand/traditional.js";
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
