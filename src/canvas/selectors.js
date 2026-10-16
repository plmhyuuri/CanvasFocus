/**
 * CanvasFocus — Canvas DOM selector registry.
 *
 * ============================================================================
 * THIS IS THE FILE YOU EDIT WHEN CANVAS HTML CHANGES. Nothing else.
 * ============================================================================
 *
 * Canvas markup is NOT a versioned contract. It changes between releases and
 * themes. Every selector below is an ORDERED FALLBACK LIST: `pick()` returns the
 * first entry that matches, so adding a new candidate is safe — put the most
 * specific/likely one first.
 *
 * Conventions:
 *   - Prefer structural/class selectors over localized text (Canvas here is
 *     bilingual EN/VI, so never match on visible words).
 *   - Keep each list to ~2-4 alternatives; more than that is a smell that the
 *     real markup needs re-checking on a live page.
 *   - When debug mode is on (`?debug` in the URL, or the popup toggle), `pick()`
 *     records which candidate actually matched into `CF.debugReports`, which the
 *     panel renders in its diagnostics overlay. Use it to confirm/replace these.
 *
 * See README.md → "When Canvas changes" for the full maintenance workflow.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /**
   * Course id from the Modules page URL: /courses/12345/modules
   * Kept as a regex (not a selector) because it reads the URL, not the DOM.
   */
  const COURSE_ID_RE = /\/courses\/(\d+)(?:\/|$|\?)/;

  /** URL shape of the page this extension enhances. */
  const MODULES_PATH_RE = /\/courses\/\d+\/modules(?:\/|$|\?)/;

  /** Ordered fallback lists. Keys are logical fields, values are CSS selectors. */
  const SELECTORS = {
    /** The element that gets replaced on SPA navigation; observation root. */
    mainContent: ["#content", "#main", ".ic-Layout-contentMain", "body"],

    /** Course title, shown in the panel header. */
    courseName: [
      ".ic-app-header__main-navigation .ellipsible",
      "#breadcrumbs .ellipsible",
      ".ellipsible",
      "h1.page-title",
    ],

    /** One container element per Canvas module. */
    moduleContainer: [".context_module"],

    /** Module heading text. */
    moduleTitle: [
      ".ig-header-title",
      ".ig-header .name",
      ".header .name",
      ".context_module .name",
    ],

    /** The clickable header used to expand/collapse a collapsed module. */
    moduleHeaderToggle: [".ig-header-title", ".ig-header", ".header"],

    /** One row per module item. */
    itemRow: ["li.context_module_item", ".context_module_item"],

    /** Item title element (text). */
    itemTitle: [".item_name .ig-title", ".item_name", ".ig-title", "a.title"],

    /** Anchor to the item's destination (used as a fallback for reveal). */
    itemLink: [".item_name a", "a.ig-title", "a"],

    /** Completion indicator on an item. */
    itemCompletion: [
      ".completion_status",
      ".completed_item",
      ".completion_indicator",
    ],
  };

  /**
   * Module-item `type` detection. Canvas puts the type as a class on the row
   * (e.g. `class="context_module_item assignment"`). The key is shown as a
   * labelled icon; unknown types fall back to a generic icon.
   */
  const ITEM_TYPES = [
    "assignment",
    "quiz",
    "discussion",
    "page",
    "external_tool",
    "external_url",
    "file",
    "subheader",
  ];

  /**
   * Module id: the container usually carries `id="context_module_123"`. Used to
   * map a panel row back to the live Canvas element for reveal-on-click.
   */
  const MODULE_ID_RE = /context_module_(\d+)/;

  /**
   * Find the first element matching any selector in `list`, in order.
   *
   * @param {ParentNode} root  element/document to query within
   * @param {string[]} list    ordered fallback selectors
   * @param {string} label     field name, used for diagnostics reporting
   * @returns {Element|null}
   */
  function pick(root, list, label) {
    if (!root || !Array.isArray(list)) return null;
    for (const selector of list) {
      let el = null;
      try {
        el = root.querySelector(selector);
      } catch (err) {
        CF.warn(`invalid selector for ${label}: ${selector}`, err);
        continue;
      }
      if (el) {
        if (CF.debug) {
          CF.debugReports.push({ label, matched: selector, ok: true });
        }
        return el;
      }
    }
    if (CF.debug) {
      CF.debugReports.push({ label, matched: null, ok: false, tried: list.slice() });
    }
    return null;
  }

  /** Like pick(), but returns every match across the first selector that hits. */
  function pickAll(root, list, label) {
    if (!root || !Array.isArray(list)) return [];
    for (const selector of list) {
      let nodes = [];
      try {
        nodes = Array.from(root.querySelectorAll(selector));
      } catch (err) {
        CF.warn(`invalid selector for ${label}: ${selector}`, err);
        continue;
      }
      if (nodes.length) {
        if (CF.debug) {
          CF.debugReports.push({ label, matched: selector, ok: true, count: nodes.length });
        }
        return nodes;
      }
    }
    if (CF.debug) {
      CF.debugReports.push({ label, matched: null, ok: false, tried: list.slice() });
    }
    return [];
  }

  /** Read the course id from a URL, or null. */
  function courseIdFromUrl(url) {
    const match = (url || globalThis.location.href).match(COURSE_ID_RE);
    return match ? match[1] : null;
  }

  /** True when the given URL is a course Modules page. */
  function isModulesPage(url) {
    return MODULES_PATH_RE.test(url || globalThis.location.href);
  }

  CF.selectors = {
    SELECTORS,
    ITEM_TYPES,
    COURSE_ID_RE,
    MODULE_ID_RE,
    pick,
    pickAll,
    courseIdFromUrl,
    isModulesPage,
  };
})();
