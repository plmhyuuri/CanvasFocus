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

  /**
   * Read the course name.
   *
   * Two sources, because Canvas crumb lists often begin with an icon-only link:
   *   1. A crumb/link that actually carries visible text (scan from the END — the
   *      deepest crumb is closest to the course name).
   *   2. `document.title`, which Canvas sets as "<Page Title>: <Course Name>",
   *      so the course is everything AFTER the first colon.
   * Keep the resolved value in the scan diagnostic so a wrong guess is visible.
   */
  function readCourseName() {
    const crumbs = pickAll(getCourseElement(), CF.selectors.SELECTORS.courseName, "courseName");
    for (let i = crumbs.length - 1; i >= 0; i -= 1) {
      const text = (crumbs[i].textContent || "").trim();
      if (text) return text;
    }

    const title = (document.title || "").trim();
    if (title.includes(":")) {
      const after = title.split(":").slice(1).join(":").trim();
      if (after) return after;
    }
    return title;
  }

  /** Detect the Canvas item type from the row's classes. */
  function readItemType(row) {
    for (const type of ITEM_TYPES) {
      if (row.classList.contains(type)) return type;
    }
    return "unknown";
  }

  /**
   * Read completion state — CONSERVATIVELY.
   *
   * Canvas is unreliable here: a module item's `<span class="completion_requirement">`
   * is the *requirement description* ("Must view the page"), present even when the
   * item is NOT complete — so it must never be read as state. And when a teacher
   * doesn't enable completion tracking, no reliable signal exists at all.
   *
   * We therefore return true ONLY on an explicit, positive marker and otherwise
   * report false ("not confirmed"), never guessing from free text. The panel shows
   * a ✓ only for true and renders nothing for false, so a missing tracker can't be
   * misrepresented as "completed".
   *
   * @param {Element} row
   * @returns {boolean}
   */
  function readCompleted(row) {
    // 1. Canvas adds `completed_item` to the row itself when the item is complete.
    if (row.classList.contains("completed_item")) {
      CF.debugReport("completedVia", { ok: true, matched: "row class completed_item" });
      return true;
    }

    // 2. An explicit completion marker element (see selectors.itemCompletedMarker).
    const marker = pick(row, CF.selectors.SELECTORS.itemCompletedMarker, "itemCompletedMarker");
    if (marker) {
      const classes = marker.classList;
      if (classes.contains("completed") || classes.contains("completed_item")) {
        CF.debugReport("completedVia", { ok: true, matched: `marker class ${marker.className}` });
        return true;
      }
      const label = (
        marker.getAttribute("aria-label") ||
        marker.getAttribute("title") ||
        ""
      ).toLowerCase();
      // Anchored: only an explicit "completed" affordance, never a requirement blurb.
      if (/\b(completed|complete|done|hoàn thành)\b/.test(label) && !/must|requirement/.test(label)) {
        CF.debugReport("completedVia", { ok: true, matched: `marker label "${label}"` });
        return true;
      }
    }

    CF.debugReport("completedVia", { ok: false });
    return false;
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

    const courseName = readCourseName();
    cache = { courseId, courseName, modules };

    const items = modules.flatMap((m) => m.items);
    const completed = items.filter((it) => it.completed).length;
    CF.debugReport("scan", {
      ok: modules.length > 0,
      matched:
        `${modules.length} modules, ${items.length} items · ` +
        `course: ${courseName ? JSON.stringify(courseName) : "(empty)"}`,
      note: `completion: ${completed}/${items.length} confirmed`,
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
