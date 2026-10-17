/**
 * CanvasFocus — data provider contract + selection.
 *
 * ============================================================================
 * THE ONE SEAM. The UI (panel.js) ONLY ever calls the active provider through
 * this contract. B2 (same-origin session fetches) becomes a drop-in: implement
 * the same four methods in providers/session.js and flip PROVIDER_KIND below.
 * ============================================================================
 *
 * Contract — all methods return Promises so the DOM (sync) and session-fetch
 * (async) implementations are interchangeable:
 *
 *   getCourses()                  -> [{ id, name, shortName?, subjectKey? }]
 *   getModules(courseId)          -> [{ id, title, weeks: number[] }]
 *   getItems(courseId, moduleId)  -> [{ id, title, type, url, completed, tracked, element? }]
 *   getCompletion(courseId)       -> { [itemId]: boolean }
 *
 * `completed` = Canvas confirms the item is done. `tracked` = Canvas defines a
 * requirement for it (so "not completed" means genuinely pending, not untracked).
 * Providers that know completion for every item should set `tracked: true`.
 * Together they drive the panel's done / pending / unknown states.
 *
 * Extra (non-contract) helper that the panel uses when present:
 *   reveal(item)                  -> void   // scroll/expand the real Canvas item
 *
 * `element` is a live DOM reference in B1 and will be absent in B2; the panel
 * handles both (falls back to opening `url` in a new tab).
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /**
   * Which provider implementation to use.
   *   "dom"     -> B1, reads the rendered page (default)
   *   "session" -> B2, same-origin fetch with the user's session cookie
   */
  const PROVIDER_KIND = "dom";

  const registry = {};
  let active = null;

  /** Called by each provider file to register itself. */
  function register(kind, provider) {
    registry[kind] = provider;
  }

  /** Instantiate + activate a provider, returning the contract object. */
  function select(kind) {
    const factory = registry[kind];
    if (!factory) {
      throw new Error(`CanvasFocus: provider "${kind}" is not registered`);
    }
    active = factory.create ? factory.create() : factory;
    return active;
  }

  function get() {
    if (!active) select(PROVIDER_KIND);
    return active;
  }

  CF.providers = { register, select, get, registry, PROVIDER_KIND };
})();
