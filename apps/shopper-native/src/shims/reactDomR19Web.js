'use strict';
/**
 * reactDomR19Web.js — React 19 compat layer for react-native-web on web only.
 *
 * Problem: react-native-web@0.18.x imports `render`, `hydrate`, and `createRoot`
 * from 'react-dom'.  React 19 removed the first two entirely and moved createRoot
 * to 'react-dom/client'.  This causes react-native-web's bootstrap to throw
 * "ReactDOM.render is not a function" before any user code runs.
 *
 * Fix: Metro aliases 'react-dom' → this file on web.  We re-export the full
 * react-dom surface and back-fill the three missing APIs using the correct
 * react-dom/client imports.
 *
 * IMPORTANT — lazy loading:
 * react-dom-client.development.js does require("react-dom") at module-init time
 * to read __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.  If we
 * eagerly require('react-dom/client') here, we create a circular dep and Metro
 * returns our partial (empty) module.exports, leaving _createRoot undefined.
 * Deferring the require to first-call time breaks the cycle: by then this module
 * is fully cached and react-dom-client gets the real internals object.
 */

// Relative path bypasses the 'react-dom' Metro alias → loads the real react-dom.
var realReactDOM = require('../../node_modules/react-dom/index.js');

var _client = null;
function client() {
  if (!_client) _client = require('react-dom/client');
  return _client;
}

module.exports = Object.assign({}, realReactDOM, {
  // React 19 moved createRoot / hydrateRoot exclusively to react-dom/client.
  createRoot: function createRoot(container, options) {
    return client().createRoot(container, options);
  },
  hydrateRoot: function hydrateRoot(container, initialChildren, options) {
    return client().hydrateRoot(container, initialChildren, options);
  },

  // React 19 removed render() and hydrate() entirely.
  // react-native-web calls these during web app bootstrap (AppRegistry.runApplication).
  render: function render(element, container, callback) {
    if (!container.__reactRoot) {
      container.__reactRoot = client().createRoot(container);
    }
    container.__reactRoot.render(element);
    if (typeof callback === 'function') callback();
  },

  hydrate: function hydrate(element, container, callback) {
    if (!container.__reactRoot) {
      container.__reactRoot = client().hydrateRoot(container, element);
      if (typeof callback === 'function') callback();
      return;
    }
    container.__reactRoot.render(element);
    if (typeof callback === 'function') callback();
  },
});
