/**
 * CanvasFocus — B2 placeholder: same-origin session-cookie provider.
 *
 * NOT LOADED in B1 (it is intentionally absent from manifest.json content_scripts).
 * It exists so the B2 path is a one-line change rather than a rewrite:
 *
 *   1. Implement the four contract methods below using `fetch` on Canvas's own
 *      page endpoints (e.g. /courses/:id/modules plus the module items endpoint),
 *      relying on the user's existing session cookie. No token, no OAuth.
 *   2. Add "src/providers/session.js" to manifest.json AFTER providers/dom.js.
 *   3. Flip PROVIDER_KIND in providers/index.js to "session".
 *
 * NOTE: B2 likely needs a background service worker for clean fetches; that
 * reintroduces the Chrome service-worker vs Firefox event-page difference and is
 * deliberately out of scope for B1.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  function notImplemented() {
    return Promise.reject(
      new Error("CanvasFocus: session provider (B2) is not implemented yet")
    );
  }

  CF.providers.register("session", {
    create() {
      return {
        getCourses: notImplemented,
        getModules: notImplemented,
        getItems: notImplemented,
        getCompletion: notImplemented,
      };
    },
  });
})();
