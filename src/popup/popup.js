/**
 * CanvasFocus — popup controller.
 *
 * Toggles the global settings that the content script reads: enabled, language,
 * and the diagnostics overlay. Kept deliberately tiny; all persistence goes
 * through CF.storage so content script and popup stay in sync automatically.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  const t = (key, vars) => CF.i18n.t(key, vars);

  const els = {
    enabled: document.getElementById("enabled"),
    language: document.getElementById("language"),
    debug: document.getElementById("debug"),
    version: document.getElementById("version"),
    open: document.getElementById("open-canvas"),
  };

  /** Apply translations to elements tagged with data-i18n. */
  function localize() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
  }

  async function init() {
    await CF.i18n.init();

    const [enabled, language, debug] = await Promise.all([
      CF.storage.get(CF.KEYS.enabled, true),
      CF.storage.get(CF.KEYS.language, "en"),
      CF.storage.get(CF.KEYS.debug, false),
    ]);

    els.enabled.checked = enabled !== false;
    els.language.value = language === "vi" ? "vi" : "en";
    els.debug.checked = Boolean(debug);

    const manifest = CF.api.runtime.getManifest();
    els.version.textContent = t("popupVersion", { v: manifest.version });

    localize();

    els.enabled.addEventListener("change", () =>
      CF.storage.set(CF.KEYS.enabled, els.enabled.checked)
    );
    els.debug.addEventListener("change", () =>
      CF.storage.set(CF.KEYS.debug, els.debug.checked)
    );
    els.language.addEventListener("change", async () => {
      await CF.i18n.setLanguage(els.language.value);
      els.version.textContent = t("popupVersion", { v: manifest.version });
      localize();
    });
  }

  init().catch((err) => CF.error("popup init failed", err));
})();
