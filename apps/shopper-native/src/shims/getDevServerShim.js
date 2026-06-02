'use strict';
/**
 * CJS-compatible shim for react-native/Libraries/Core/Devtools/getDevServer.
 *
 * WHY THIS EXISTS
 * ---------------
 * @expo/metro-runtime 4.0.1 messageSocket.native.ts does:
 *
 *   const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');
 *   const devServer = getDevServer();
 *
 * RN 0.81 exports getDevServer as ESM (export default fn). A bare require()
 * returns { default: fn, __esModule: true } — an Object, not a function —
 * crashing with: TypeError: getDevServer is not a function (it is Object)
 *
 * This shim exports the function directly as module.exports so require()
 * returns the function itself. It also sets .default for import statements.
 *
 * IMPLEMENTATION
 * --------------
 * Uses global.__fbSourceURL (always available in Hermes/RN dev builds) to
 * derive the Metro server origin. Falls back to localhost:8081.
 * bundleLoadedFromServer is always true here — this code only ever executes
 * in development builds where the bundle IS loaded from the Metro server
 * (effects.native.ts guards on process.env.NODE_ENV !== 'production').
 */

var _cached = null;

function getDevServer() {
  if (_cached) return _cached;

  var url = 'http://localhost:8081/';

  try {
    // Hermes / React Native exposes the bundle source URL as a global.
    // This is the most reliable way to get the Metro server origin without
    // using any internal deep imports.
    var fbUrl = global.__fbSourceURL || global.__BUNDLE_URL__;
    if (typeof fbUrl === 'string' && fbUrl) {
      var match = fbUrl.match(/^https?:\/\/[^/]+\//);
      if (match) url = match[0];
    }
  } catch (_e) {
    // Keep the localhost fallback — the WebSocket may still connect.
  }

  _cached = {
    url: url,
    fullBundleUrl: (typeof global.__fbSourceURL === 'string' && global.__fbSourceURL) || url,
    // Always true: this shim only runs in dev builds (messageSocket.native.ts
    // is gated by process.env.NODE_ENV !== 'production'). If we returned
    // false here, messageSocket.native.ts would throw and prevent the bundle
    // from finishing initialization.
    bundleLoadedFromServer: true,
  };
  return _cached;
}

// CJS export — require() returns the function directly.
module.exports = getDevServer;
// ESM interop — import getDevServer from '...' also works.
module.exports.default = getDevServer;
module.exports.__esModule = true;
