/**
 * Shared harness for the pure-logic tests.
 *
 * The extension's files are plain scripts that attach to a single global
 * namespace (`globalThis.__canvasFocus`), so tests load them in dependency order
 * after stubbing the namespace. No bundler, no jsdom, no dependencies — these
 * tests only cover logic that does not need a DOM (weeks, subjects, i18n).
 * DOM behaviour is verified manually against a live Canvas page (see README).
 */
"use strict";

const path = require("node:path");

const SRC = path.join(__dirname, "..", "src");

/** Fresh, minimal namespace stub with the bits the pure modules touch. */
function resetNamespace() {
  globalThis.__canvasFocus = {
    debug: false,
    debugReports: new Map(),
    log() {},
    warn() {},
    error() {},
    debugLog() {},
    debugReport() {},
    resetDebugReports() {
      this.debugReports = new Map();
    },
    i18n: { translations: {} },
    storage: { get: async () => undefined, set: async () => {}, onChange: () => () => {} },
  };
  return globalThis.__canvasFocus;
}

/** Load an extension source file (relative to src/) into the global namespace. */
function load(relativePath) {
  require(path.join(SRC, relativePath));
}

module.exports = { SRC, resetNamespace, load };
