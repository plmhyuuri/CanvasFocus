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

/**
 * Load an extension source file (relative to src/) into the global namespace.
 *
 * Re-executes the file every time (require cache is busted) so tests that reset
 * the namespace in `beforeEach` get a clean registration — the files are plain
 * scripts, not modules, so re-running them is exactly what the browser does on
 * reload.
 */
function load(relativePath) {
  const full = require.resolve(path.join(SRC, relativePath));
  delete require.cache[full];
  require(full);
}

module.exports = { SRC, resetNamespace, load };
