module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin",
      // Strip import.meta from the web bundle. Metro emits import.meta
      // references during the web transform pass which browsers refuse to
      // parse outside <script type="module">. No-op for native (Hermes
      // bundles never emit import.meta).
      ["babel-plugin-transform-import-meta", { module: "ES6" }],
    ],
  };
};
