/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' tells react-native-css-interop to emit --css-interop-darkMode: class dark
  // as a CSS variable instead of 'media'. Without this, NativeWind injects 'media'
  // into the <head> on web, which causes color-scheme.js to throw an uncaught Error
  // that kills the entire React tree.
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      fontFamily: {
        sans:      ["System"],
        arabic:    ["System"],
      },
    },
  },
  plugins: [],
};
