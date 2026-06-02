const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

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
  // ─── Fix: @expo/metro-runtime 4.0.1 + React Native 0.81 ESM/CJS mismatch ──
  //
  // messageSocket.native.ts uses require() to load RN modules that RN 0.81
  // switched to ESM exports. A bare require() on an ESM module returns the
  // namespace object { default: X } instead of X directly, crashing with:
  //   TypeError: getDevServer is not a function (it is Object)
  //   TypeError: constructor is not callable
  //
  // Each shim exports the value directly as module.exports = X (CJS) so
  // require() returns it directly, and also sets .default for import stmts.
  if (platform !== "web") {
    if (moduleName === "react-native/Libraries/Core/Devtools/getDevServer") {
      return {
        filePath: path.resolve(__dirname, "src/shims/getDevServerShim.js"),
        type: "sourceFile",
      };
    }
    if (moduleName === "react-native/Libraries/WebSocket/WebSocket") {
      return {
        filePath: path.resolve(__dirname, "src/shims/WebSocketShim.js"),
        type: "sourceFile",
      };
    }
  }

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
