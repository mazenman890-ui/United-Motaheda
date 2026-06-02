'use strict';
/**
 * No-op stub for @expo/metro-runtime's messageSocket.native module.
 *
 * The real messageSocket.native.ts opens a WebSocket to Metro's /message
 * endpoint and listens for RSC (React Server Components) reload commands.
 * This project does not use RSC, so the module is not needed.
 *
 * The real module also crashes on RN 0.81 because it calls require() on
 * two modules that switched to ESM exports:
 *   - react-native/Libraries/Core/Devtools/getDevServer
 *   - react-native/Libraries/WebSocket/WebSocket
 *
 * Stubbing the entire module is cleaner than chasing every ESM/CJS shim.
 */
