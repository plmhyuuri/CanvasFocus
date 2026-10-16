/**
 * CanvasFocus — B1 data provider: reads the ALREADY-RENDERED Canvas DOM.
 *
 * No network requests, no tokens, no OAuth. It only sees what is on the current
 * Modules page, which is exactly the B1 scope (in-page enhancer).
 *
 * Depends on: canvas/selectors.js (all DOM knowledge lives there), canvas/weeks.js.
 * Implements the contract declared in providers/index.js.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  const { pick, pickAll, courseIdFromUrl, MODULE_ID_RE, ITEM_TYPES } = CF.selectors;

  /** Cache keyed by course id; invalidated on "re-scan". */
  let cache = null;

  function getCourseElement() {
    return document;
  }

  /** Read the course name from the page header/breadcrumb, falling back to title. */
  function readCourseName() {
    const el = pick(getCourseElement(), CF.selectors.SELECTORS.courseName, "courseName");
    if (el && el.textContent.trim()) return el.textContent.trim();
    // document.title is typically "Course Name: Modules" — strip the suffix.
    return (document.title || "").split(":")[0].trim() || document.title;
  }

  /** Detect the Canvas item type from the row's classes. */
  function readItemType(row) {
    for (const type of ITEM_TYPES) {
      if (row.classList.contains(type)) return type;
    }
    return "unknown";
  }

  /**
   * Read completion state. Canvas signals this in two places, in priority order:
   *   1. `completed_item` class on the row itself (most common; the indicator
   *      element often isn't rendered at all until completion requirements exist)
   *   2. a completion indicator child element
   * Must NOT return early on a missing indicator, or (1) becomes unreachable.
   */
  function readCompleted(row) {
    if (row.classList.contains("completed_item")) return true;

    const indicator = pick(row, CF.selectors.SELECTORS.itemCompletion, "itemCompletion");
    if (!indicator) return false;

    if (
      indicator.classList.contains("completed") ||
      indicator.classList.contains("completed_item")
    ) {
      return true;
    }
    // Canvas renders a checkmark / "completed" icon; sniff its label as a last resort.
    const label = (indicator.getAttribute("title") || indicator.textContent || "").toLowerCase();
    return /complete|done|hoàn thành/.test(label);
  }

  /** Parse one `li.context_module_item` into a contract item. */
  function parseItem(row, moduleId, index) {
    const titleEl = pick(row, CF.selectors.SELECTORS.itemTitle, "itemTitle");
    const linkEl = pick(row, CF.selectors.SELECTORS.itemLink, "itemLink");
    const title = ((titleEl || row).textContent || "").trim() || CF.i18n.t("typeUnknown");
    const type = readItemType(row);

    return {
      id: row.id || `${moduleId}:${index}`,
      title,
      type,
      url: linkEl ? linkEl.href : null,
      completed: readCompleted(row),
      moduleId,
      // Live DOM reference: lets the panel reveal the real row on click (B1 only).
      element: row,
    };
  }

  /** Scan the page into the same shape the contract exposes (cached). */
  function scan() {
    if (cache) return cache;

    const courseId = courseIdFromUrl();
    const containers = pickAll(
      getCourseElement(),
      CF.selectors.SELECTORS.moduleContainer,
      "moduleContainer"
    );

    const modules = containers.map((container, index) => {
      const idMatch = (container.id || "").match(MODULE_ID_RE);
      const moduleId = idMatch ? idMatch[1] : `idx-${index}`;
      const titleEl = pick(container, CF.selectors.SELECTORS.moduleTitle, "moduleTitle");
      const title = ((titleEl || container).textContent || "").trim();

      const rows = pickAll(container, CF.selectors.SELECTORS.itemRow, "itemRow");
      const items = rows.map((row, i) => parseItem(row, moduleId, i));

      return {
        id: moduleId,
        title,
        weeks: CF.weeks.extractWeeks(title),
        items,
        element: container,
      };
    });

    cache = { courseId, courseName: readCourseName(), modules };
    CF.debugReport("scan", {
      ok: modules.length > 0,
      matched: `${modules.length} modules, ${modules.reduce((n, m) => n + m.items.length, 0)} items`,
    });
    return cache;
  }

  /** Reveal a real Canvas element: expand its module if collapsed, then scroll. */
  function reveal(item) {
    if (!item || !item.element) {
      if (item && item.url) globalThis.open(item.url, "_blank", "noopener");
      return;
    }
    const row = item.element;

    // If the row is hidden, the module is collapsed — click its header to open it.
    if (!row.offsetParent) {
      const container = row.closest(CF.selectors.SELECTORS.moduleContainer.join(","));
      if (container) {
        const toggle = pick(
          container,
          CF.selectors.SELECTORS.moduleHeaderToggle,
          "moduleHeaderToggle"
        );
        if (toggle) toggle.click();
      }
    }

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(row);
  }

  /** Brief outline pulse so the user can spot the revealed row. */
  function flash(row) {
    row.classList.add("cf-reveal-flash");
    setTimeout(() => row.classList.remove("cf-reveal-flash"), 1600);
  }

  const provider = {
    create() {
      return {
        getCourses() {
          const data = scan();
          const subjectKey = CF.subjects.subjectKeyFromText(data.courseName);
          return Promise.resolve([
            { id: data.courseId, name: data.courseName, subjectKey },
          ]);
        },
        getModules() {
          return Promise.resolve(
            scan().modules.map(({ id, title, weeks }) => ({ id, title, weeks }))
          );
        },
        getItems(_courseId, moduleId) {
          const module = scan().modules.find((m) => m.id === moduleId);
          return Promise.resolve(module ? module.items : []);
        },
        getCompletion() {
          const completion = {};
          for (const module of scan().modules) {
            for (const item of module.items) completion[item.id] = item.completed;
          }
          return Promise.resolve(completion);
        },
        // Non-contract conveniences used by the panel (B1 only):
        getModulesWithItems() {
          return Promise.resolve(scan().modules);
        },
        reveal,
        /** Force a fresh DOM read on the next call. */
        invalidate() {
          cache = null;
        },
      };
    },
  };

  CF.providers.register("dom", provider);
})();
