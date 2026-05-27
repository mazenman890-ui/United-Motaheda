// Runtime web shims: set dark-mode strategy and adapt ReactDOM.render -> createRoot
import React from "react";
if (typeof window !== "undefined") {
  try {
    // Prefer `class` strategy for dark mode interop to avoid "type 'media'" errors.
    // Use require to avoid static imports that break native bundling.
    const rn = require("react-native");
    if (rn && rn.StyleSheet && typeof rn.StyleSheet.setFlag === "function") {
      try {
        rn.StyleSheet.setFlag("darkMode", "class");
      } catch {}
    }
  } catch {}

  try {
    // Monkeypatch ReactDOM.render to delegate to createRoot when available.
    // This keeps third-party libs that call ReactDOM.render behaving under React 18.
    const globalAny = (globalThis as any) || window as any;
    const ReactDOM = globalAny.ReactDOM || (window as any).ReactDOM;
    if (ReactDOM && typeof ReactDOM.render === "function") {
      // Always obtain createRoot from react-dom/client (not react-dom) to suppress
      // the React 18 warning "You are importing createRoot from 'react-dom'".
      let createRootFn: ((container: Element) => { render: (el: any) => void }) | null = null;
      try {
        const ReactDOMClient = require("react-dom/client");
        if (ReactDOMClient && typeof ReactDOMClient.createRoot === "function") {
          createRootFn = ReactDOMClient.createRoot;
        }
      } catch {}
      // Fallback: use whatever is already on ReactDOM (avoids hard crash if /client unavailable)
      if (!createRootFn && typeof ReactDOM.createRoot === "function") {
        createRootFn = (container: Element) => ReactDOM.createRoot(container);
      }

      if (createRootFn) {
        const origRender = ReactDOM.render.bind(ReactDOM);
        const _createRoot = createRootFn;
        ReactDOM.render = function (element: any, container: any, callback?: any) {
          try {
            if (!container.__reactRoot) {
              container.__reactRoot = _createRoot(container);
            }
            container.__reactRoot.render(element);
            if (typeof callback === "function") callback();
          } catch (e) {
            return origRender(element, container, callback);
          }
        };
      }
    }
  } catch {}
}

// Export a no-op component so expo-router treats this file as a valid route module
// while still executing the side-effect shim on import.
export default function InitWeb(): null {
  return null;
}
