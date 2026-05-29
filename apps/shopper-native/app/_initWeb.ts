/**
 * _initWeb.ts — Web-only runtime shims executed before any component renders.
 *
 * Imported at the very top of app/_layout.tsx so it runs before any other
 * module-level side-effects reach the DOM.
 *
 * Three problems solved here:
 *
 * 1. react-native-web StyleSheet dark-mode strategy
 *    RNW defaults to 'media' (system CSS media query).  Calling
 *    StyleSheet.setFlag('darkMode', 'class') switches it to class-based
 *    control, which is required before anything calls Appearance.setColorScheme.
 *    Must run synchronously, as close to module load as possible.
 *
 * 2. ReactDOM.render → createRoot bridge
 *    Third-party libs built for React 17 sometimes call ReactDOM.render.
 *    We route those calls through createRoot so React 18's concurrent mode
 *    works correctly and avoids the "passed to ReactDOM.render" warning.
 *
 * 3. Known un-fixable library warnings
 *    Some warnings originate deep inside react-native-web or expo libraries
 *    that we cannot patch at source.  We selectively suppress them here so
 *    the console stays clean for real errors.
 */

// ─── 1. Dark-mode strategy — must run first, synchronously ───────────────────

if (typeof window !== "undefined") {
  // Use require() inside the web branch so the native bundler never touches
  // react-native during an Android/iOS build.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require("react-native") as typeof import("react-native");
    const ss = (rn as any).StyleSheet;
    if (ss && typeof ss.setFlag === "function") {
      ss.setFlag("darkMode", "class");
    }
  } catch {
    // react-native-web version does not support setFlag — safe to ignore.
  }
}

// ─── 2. Console noise suppressor ─────────────────────────────────────────────

if (typeof window !== "undefined") {
  // Messages that come from library internals we cannot patch at source.
  // Suppressed only on web; native builds never reach this code.
  const SUPPRESSED_PATTERNS: string[] = [
    // React 18: react-native-web still imports createRoot from the legacy path.
    "You are importing createRoot from \"react-dom\"",
    // expo-notifications: push token listener is a no-op on web.
    "Listening to push token changes is not yet fully supported on web",
    // react-native-web: harmless initialisation warning when setFlag runs late.
    "Cannot manually set color scheme",
  ];

  const shouldSuppress = (args: unknown[]): boolean => {
    if (!args.length || typeof args[0] !== "string") return false;
    return SUPPRESSED_PATTERNS.some((p) => (args[0] as string).includes(p));
  };

  const origError = console.error.bind(console);
  const origWarn  = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    if (!shouldSuppress(args)) origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (!shouldSuppress(args)) origWarn(...args);
  };
}

// ─── 3. ReactDOM.render → createRoot bridge ───────────────────────────────────

if (typeof window !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactDOMClient = require("react-dom/client") as {
      createRoot: (el: Element) => { render: (node: unknown) => void };
    };

    if (ReactDOMClient && typeof ReactDOMClient.createRoot === "function") {
      const createRoot = ReactDOMClient.createRoot;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ReactDOM = require("react-dom") as {
        render?: (...args: unknown[]) => unknown;
      };

      if (ReactDOM && typeof ReactDOM.render === "function") {
        const origRender = ReactDOM.render.bind(ReactDOM);

        (ReactDOM as any).render = function (
          element: unknown,
          container: Element & { __reactRoot?: ReturnType<typeof createRoot> },
          callback?: () => void,
        ) {
          try {
            if (!container.__reactRoot) {
              container.__reactRoot = createRoot(container);
            }
            container.__reactRoot.render(element);
            callback?.();
          } catch {
            return origRender(element, container, callback);
          }
        };
      }
    }
  } catch {
    // react-dom/client unavailable — fall back to whatever ReactDOM already has.
  }
}

// ─── Module export ────────────────────────────────────────────────────────────

// Expo Router requires every file in app/ to export a default React component.
// This file is pure side-effects, so we export a no-op component.
export default function WebShims(): null {
  return null;
}
