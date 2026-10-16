/**
 * CanvasFocus — SPA route + content observer.
 *
 * Canvas behaves like a single-page app: it swaps page content via
 * `history.pushState` without a full reload. This module detects both kinds of
 * change and notifies subscribers, so the panel can re-scan at the right moment.
 *
 * Two event kinds:
 *   onRoute(cb)    -> the URL changed (navigated to/away from a Modules page)
 *   onContent(cb)  -> DOM changed for the current URL (module list rendered/replaced)
 *
 * Robustness: we patch pushState/replaceState AND listen to popstate/hashchange
 * AND observe DOM mutations (debounced). Any one of them alone is not enough.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  const routeHandlers = new Set();
  const contentHandlers = new Set();

  let lastUrl = globalThis.location.href;
  let started = false;
  let observer = null;

  function emit(handlers) {
    handlers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        CF.error("route handler failed", err);
      }
    });
  }

  /** Debounced content notification (Canvas mutates the DOM many times per nav). */
  const notifyContent = CF.debounce(() => emit(contentHandlers), 300);

  function checkUrl() {
    if (globalThis.location.href === lastUrl) return;
    lastUrl = globalThis.location.href;
    CF.debugLog("route change", lastUrl);
    emit(routeHandlers);
    // Content for the new route renders shortly after the URL settles.
    notifyContent();
  }

  /** Wrap a history method so our check runs after Canvas calls it. */
  function patchHistory(method) {
    const original = history[method];
    if (!original) return;
    history[method] = function patched(...args) {
      const result = original.apply(this, args);
      // Microtask: let the caller finish before we read location.
      Promise.resolve().then(checkUrl);
      return result;
    };
  }

  function start() {
    if (started) return;
    started = true;

    patchHistory("pushState");
    patchHistory("replaceState");
    globalThis.addEventListener("popstate", checkUrl);
    globalThis.addEventListener("hashchange", checkUrl);

    const contentRoot =
      CF.selectors.pick(document, CF.selectors.SELECTORS.mainContent, "mainContent") ||
      document.body;

    observer = new MutationObserver(() => notifyContent());
    observer.observe(contentRoot, { childList: true, subtree: true });

    CF.debugLog("route observer started on", contentRoot);
  }

  function onRoute(fn) {
    routeHandlers.add(fn);
    return () => routeHandlers.delete(fn);
  }

  function onContent(fn) {
    contentHandlers.add(fn);
    return () => contentHandlers.delete(fn);
  }

  CF.route = { start, onRoute, onContent, checkUrl };
})();
