/**
 * CanvasFocus — completion state resolution (pure, DOM-free).
 *
 * Canvas exposes completion imperfectly, so the panel shows one of four states:
 *
 *   "done"        Canvas explicitly confirms the item is complete.
 *   "done-manual" The user marked it complete themselves (Canvas shows nothing).
 *   "pending"     Canvas tracks a requirement for this item and it is NOT met.
 *   "unknown"     Canvas exposes no tracking signal at all — we cannot know.
 *
 * The distinction between "pending" and "unknown" is the whole point: a blank
 * row used to be ambiguous ("did I do it, or is tracking off?"). The provider now
 * reports `item.tracked` (does Canvas track a requirement here?), so `pending`
 * is a real signal and `unknown` is an honest "no idea".
 *
 * Kept pure and separate from panel.js so it can be unit-tested with no DOM.
 * Depends on: util/browser.js (namespace only).
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /** Storage key holding the user's manual overrides for one course. */
  const MANUAL_PREFIX = "manualDone:";

  /** Storage key for one course's manual-completion map: { [itemId]: true }. */
  function storageKey(courseId) {
    return `${MANUAL_PREFIX}${courseId}`;
  }

  /**
   * Resolve an item's display state.
   *
   * @param {{completed:boolean, tracked:boolean, id:string}} item
   * @param {Object<string,boolean>} [manual] map of manually-completed item ids
   * @returns {"done"|"done-manual"|"pending"|"unknown"}
   */
  function resolve(item, manual) {
    if (!item) return "unknown";
    if (item.completed) return "done";
    if (manual && manual[item.id]) return "done-manual";
    return item.tracked ? "pending" : "unknown";
  }

  /** True for any state that should be treated as complete (Canvas or manual). */
  function isDone(stateName) {
    return stateName === "done" || stateName === "done-manual";
  }

  CF.itemState = { resolve, isDone, storageKey, MANUAL_PREFIX };
})();
