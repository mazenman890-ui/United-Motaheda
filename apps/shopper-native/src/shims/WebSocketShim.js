'use strict';
/**
 * CJS-compatible shim for react-native/Libraries/WebSocket/WebSocket.
 *
 * Same root cause as getDevServerShim.js:
 * @expo/metro-runtime 4.0.1 messageSocket.native.ts does:
 *
 *   const WebSocket = require('react-native/Libraries/WebSocket/WebSocket');
 *   return new WebSocket(...)   ← "constructor is not callable"
 *
 * RN 0.81 exports WebSocket as ESM so require() returns the namespace object
 * { default: class WebSocket } instead of the class itself.
 *
 * React Native always registers WebSocket as a global, so we can safely
 * expose it from there — no circular dependency, no reimplementation needed.
 */

var WebSocketClass = global.WebSocket;
module.exports = WebSocketClass;
module.exports.default = WebSocketClass;
module.exports.__esModule = true;
