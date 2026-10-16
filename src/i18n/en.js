/**
 * CanvasFocus — English strings.
 *
 * MAINTENANCE: every key added here MUST also be added to vi.js with the same
 * key name. The panel/popup call `CF.i18n.t(key)`. Missing keys fall back to the
 * key text itself (visible, so it's obvious something is missing).
 *
 * Placeholders use {name} and are filled by `t(key, { name: value })`.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  CF.i18n = CF.i18n || {};
  CF.i18n.translations = CF.i18n.translations || {};
  CF.i18n.translations.en = {
    // Panel chrome
    panelTitle: "Course modules",
    open: "Open CanvasFocus",
    close: "Close panel",
    refresh: "Re-scan page",
    diagnostics: "Diagnostics",
    diagnosticsOn: "Show diagnostics overlay",

    // Search / list
    searchPlaceholder: "Search modules and items…",
    groupOther: "Other",
    weekLabel: "Week {n}",
    itemCount: "{n} items",
    itemCountOne: "1 item",

    // Empty states
    emptyNoItems: "No module items found on this page.",
    emptySearch: "No matches for “{q}”.",
    emptyNotModules: "Open a course Modules page to use CanvasFocus.",

    // Item types
    typeAssignment: "Assignment",
    typeQuiz: "Quiz",
    typeDiscussion: "Discussion",
    typePage: "Page",
    typeExternalTool: "External tool",
    typeExternalUrl: "Link",
    typeFile: "File",
    typeSubheader: "Section",
    typeUnknown: "Item",

    // Completion
    completed: "Completed",
    notCompleted: "Not completed",

    // Diagnostics overlay
    debugHint: "If a field shows “MISS”, update it in src/canvas/selectors.js.",
    debugCounts: "Scanned",
    debugNone: "No data scanned yet.",

    // Popup
    popupEnabled: "Enable on Canvas",
    popupLanguage: "Language",
    popupDiagnostics: "Diagnostics overlay",
    popupOpenCanvas: "Open Canvas",
    popupHint: "Set your Canvas language preference and whether the panel runs.",
    popupVersion: "Version {v}",
  };
})();
