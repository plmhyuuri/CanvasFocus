/**
 * CanvasFocus — i18n runtime.
 *
 * Mirrors VinFocus's pattern (`t(key)`, storage-backed language) but persists the
 * choice via the extension `storage` API instead of localStorage.
 *
 * Depends on: util/browser.js (namespace + storage), i18n/en.js, i18n/vi.js.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  CF.i18n = CF.i18n || {};
  CF.i18n.translations = CF.i18n.translations || {};

  const SUPPORTED = ["en", "vi"];
  let currentLanguage = "en";
  const listeners = new Set();

  /** Load the persisted language (call once during bootstrap). */
  async function init() {
    const stored = await CF.storage.get(CF.KEYS.language, "en");
    currentLanguage = SUPPORTED.includes(stored) ? stored : "en";
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  /** Persist + switch language, then notify listeners so the UI re-renders. */
  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang) || lang === currentLanguage) {
      currentLanguage = SUPPORTED.includes(lang) ? lang : currentLanguage;
      return currentLanguage;
    }
    currentLanguage = lang;
    await CF.storage.set(CF.KEYS.language, lang);
    listeners.forEach((fn) => {
      try {
        fn(lang);
      } catch (err) {
        CF.warn("i18n listener failed", err);
      }
    });
    return lang;
  }

  function onLanguageChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /**
   * Translate `key`, substituting {placeholders} from `vars`.
   * Falls back to English, then to the raw key (so gaps are visible).
   */
  function t(key, vars) {
    const table = CF.i18n.translations;
    let text =
      (table[currentLanguage] && table[currentLanguage][key]) ??
      (table.en && table.en[key]) ??
      key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (m, name) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m
      );
    }
    return text;
  }

  CF.i18n.init = init;
  CF.i18n.getLanguage = getLanguage;
  CF.i18n.setLanguage = setLanguage;
  CF.i18n.onLanguageChange = onLanguageChange;
  CF.i18n.t = t;
  CF.i18n.SUPPORTED = SUPPORTED;
})();
