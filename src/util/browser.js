/**
 * CanvasFocus — shared runtime helpers.
 *
 * LOAD ORDER: this file must be listed first in manifest.json `content_scripts.js`.
 * It creates the single global namespace that every other file attaches to.
 *
 * No-build constraint (MV3): content scripts cannot use static ES `import`, so all
 * modules share `globalThis.__canvasFocus` (aliased to `CF` locally). Keep this
 * namespace the ONLY global the extension adds.
 *
 * Works in both Chrome and Firefox: `browser` is the promise-based API in Firefox,
 * `chrome` is the promise-based API in Chrome MV3. Prefer `browser` when present.
 */
(function () {
  "use strict";

  const CF = (globalThis.__canvasFocus = globalThis.__canvasFocus || {});

  /** Cross-browser extension API handle. */
  CF.api = globalThis.browser ?? globalThis.chrome;

  /**
   * Wrap an extension API call so it works whether the browser returns a Promise
   * (Firefox / Chrome MV3) or requires a Node-style callback (older behavior).
   * Keeps call sites free of browser differences.
   */
  function callAsync(fn, ...args) {
    if (typeof fn !== "function") {
      return Promise.reject(new Error("extension API unavailable"));
    }
    let result;
    try {
      result = fn(...args);
    } catch (err) {
      return Promise.reject(err);
    }
    if (result && typeof result.then === "function") {
      return result;
    }
    // Callback style fallback (only used if a browser still requires callbacks).
    return new Promise((resolve, reject) => {
      fn(...args, (value) => {
        const err = CF.api.runtime && CF.api.runtime.lastError;
        if (err) {
          reject(new Error(err.message || String(err)));
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Small promise-based wrapper over `storage.local` so callers never deal with the
   * callback/promise split. Values are JSON-serializable.
   */
  CF.storage = {
    async get(key, fallback) {
      try {
        const bag = await callAsync(CF.api.storage.local.get.bind(CF.api.storage.local), key);
        return bag && Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : fallback;
      } catch (err) {
        CF.warn(`storage.get(${key}) failed`, err);
        return fallback;
      }
    },
    async set(key, value) {
      try {
        await callAsync(CF.api.storage.local.set.bind(CF.api.storage.local), { [key]: value });
      } catch (err) {
        CF.warn(`storage.set(${key}) failed`, err);
      }
    },
    /** Subscribe to changes for a single key. Returns an unsubscribe function. */
    onChange(key, handler) {
      if (!CF.api.storage || !CF.api.storage.onChanged) {
        return () => {};
      }
      const listener = (changes, area) => {
        if (area === "local" && Object.prototype.hasOwnProperty.call(changes, key)) {
          handler(changes[key].newValue);
        }
      };
      CF.api.storage.onChanged.addListener(listener);
      return () => CF.api.storage.onChanged.removeListener(listener);
    },
  };

  /** Storage keys used across the extension — centralised to avoid typos. */
  CF.KEYS = {
    enabled: "enabled",
    language: "language",
    debug: "debug",
    panelOpen: "panelOpen",
  };

  // ---------------------------------------------------------------------------
  // Logging / diagnostics
  // ---------------------------------------------------------------------------

  const PREFIX = "[CanvasFocus]";

  /** Debug mode is toggled at runtime by bootstrap (URL `?debug` or stored flag). */
  CF.debug = false;

  /**
   * Aggregated diagnostics, keyed by field label (e.g. "itemCompletion").
   *
   * Aggregated rather than appended because `pick()` runs once per module item:
   * a 100-item course would otherwise emit 100 lines per field and make the
   * overlay useless. We keep counts plus the last matched/tried selector.
   *
   *   label -> { label, ok, miss, matched, tried }
   */
  CF.debugReports = new Map();

  /** Record one selector lookup result. No-op unless debug mode is on. */
  CF.debugReport = function debugReport(label, { ok, matched, tried }) {
    if (!CF.debug) return;
    let report = CF.debugReports.get(label);
    if (!report) {
      report = { label, ok: 0, miss: 0, matched: null, tried: null };
      CF.debugReports.set(label, report);
    }
    if (ok) {
      report.ok += 1;
      if (matched) report.matched = matched;
    } else {
      report.miss += 1;
      if (tried) report.tried = tried;
    }
  };

  CF.resetDebugReports = function resetDebugReports() {
    CF.debugReports = new Map();
  };

  CF.log = (...args) => console.log(PREFIX, ...args);
  CF.warn = (...args) => console.warn(PREFIX, ...args);
  CF.error = (...args) => console.error(PREFIX, ...args);
  CF.debugLog = (...args) => {
    if (CF.debug) console.log(PREFIX, "[debug]", ...args);
  };

  /** True when the page URL asks for the diagnostics overlay. */
  CF.isDebugUrl = function isDebugUrl() {
    return /[?&]debug(?:=|\b)/.test(globalThis.location.search);
  };

  /** Debounce helper (used by the route observer and search input). */
  CF.debounce = function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  };
})();
