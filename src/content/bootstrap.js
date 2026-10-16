/**
 * CanvasFocus — content-script entry point.
 *
 * Runs once on every matching page. Job:
 *   1. Respect the global on/off + debug settings.
 *   2. Load the language preference.
 *   3. Mount the panel.
 *   4. Start the route observer and forward route/content changes to the panel.
 *
 * Must be the LAST file in manifest.json content_scripts.js (it depends on all
 * the others having registered themselves on the namespace).
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /** Guard against double-injection (some pages can trigger it). */
  if (CF.__booted) return;
  CF.__booted = true;

  async function boot() {
    const enabled = await CF.storage.get(CF.KEYS.enabled, true);
    CF.debug = CF.isDebugUrl() || (await CF.storage.get(CF.KEYS.debug, false));

    await CF.i18n.init();
    CF.providers.select(CF.providers.PROVIDER_KIND);

    if (!enabled) {
      CF.log("disabled via settings — not mounting");
    } else {
      CF.panel.mount();
      CF.route.onRoute(() => CF.panel.onRouteChange());
      CF.route.onContent(() => CF.panel.refresh());
      CF.route.start();
      CF.panel.onRouteChange();
    }

    // React live to popup changes.
    CF.storage.onChange(CF.KEYS.enabled, (value) => {
      if (value === false) {
        if (CF.panel) CF.panel.setOpen(false);
        const host = document.getElementById("canvasfocus-host");
        if (host) host.style.display = "none";
      } else if (value === true) {
        CF.panel.mount();
        CF.panel.onRouteChange();
      }
    });
    CF.storage.onChange(CF.KEYS.debug, (value) => {
      CF.debug = Boolean(value) || CF.isDebugUrl();
      CF.panel.refresh();
    });
  }

  boot().catch((err) => CF.error("boot failed", err));
})();
