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
   * Strings that carry no name information: empty, or punctuation/ellipsis only.
   * Canvas's crumb bar includes an overflow toggle whose text is literally "…".
   */
  const JUNK_NAME = /^[\s.…·•*+\-–—_/|,]*$/;

  /** Canvas page/route words that are never a course name (EN + VI). */
  const PAGE_WORDS = new Set([
    "modules", "home", "dashboard", "assignments", "grades", "pages", "files",
    "syllabus", "quizzes", "discussions", "announcements", "settings", "people",
    "outcomes", "rubrics", "collaborations", "conferences", "course", "courses",
    "account", "calendar", "inbox", "history", "student view", "course modules",
    "groups", "help",
    "các học phần của khóa học", "trang chủ", "bảng điều khiển", "bài tập",
    "điểm", "trang", "tệp", "đề cương", "thảo luận", "thông báo", "cài đặt",
    "mọi người", "khóa học", "lịch", "hộp thư đến",
  ]);

  function looksLikeCourseName(text) {
    const value = (text || "").trim();
    if (!value || JUNK_NAME.test(value)) return false;
    if (PAGE_WORDS.has(value.toLowerCase())) return false;
    return /[0-9a-zà-ỹ]/i.test(value); // must contain at least one word character
  }

  /**
   * Read the course name, choosing among several candidates rather than trusting
   * the first crumb (breadcrumb bars contain icon-only links and an "…" overflow
   * toggle, and `document.title` format varies by Canvas version).
   *
   * Candidates: crumb-link texts + both halves of `document.title`. Junk and page
   * words are filtered out; among what remains we prefer one containing a digit
   * (Vinschool course names include a grade number), then the longest.
   *
   * The full candidate list is reported to the diagnostics overlay so a wrong
   * pick is visible and the heuristic can be replaced with a hard rule.
   */
  function readCourseName() {
    const candidates = [];

    for (const crumb of pickAll(
      getCourseElement(),
      CF.selectors.SELECTORS.courseName,
      "courseName"
    )) {
      candidates.push((crumb.textContent || "").trim());
    }

    const title = (document.title || "").trim();
    if (title.includes(":")) {
      const parts = title.split(":");
      candidates.push(parts[0].trim());
      candidates.push(parts.slice(1).join(":").trim());
    } else if (title) {
      candidates.push(title);
    }

    CF.debugReport("courseNameCandidates", {
      ok: true,
      matched: JSON.stringify(candidates),
    });

    const valid = candidates.filter(looksLikeCourseName);
    if (!valid.length) return title;

    valid.sort((a, b) => {
      const digit = (s) => (/\d/.test(s) ? 1 : 0);
      return digit(b) - digit(a) || b.length - a.length;
    });
    return valid[0];
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

  /** First element matching any selector in `list`, WITHOUT recording diagnostics. */
  function peek(root, list) {
    if (!root || !Array.isArray(list)) return null;
    for (const selector of list) {
      try {
        const el = root.querySelector(selector);
        if (el) return el;
      } catch (_err) {
        /* ignore invalid selectors here — pick()/pickAll() already report them */
      }
    }
    return null;
  }

  /**
   * Canvas class names minus the per-object id token. Every item row carries a
   * class like `Quiz_2253163` / `WikiPage_2702512`, which would otherwise make
   * every row look unique. Stripping them lets us compare rows by their MEANINGFUL
   * classes (`completed_item`, `dupeable`, `indent_1`, …).
   */
  const OBJECT_ID_CLASS = /^[A-Za-z][A-Za-z0-9]*_\d+$/;

  function classTokens(className) {
    return String(className || "")
      .split(/\s+/)
      .filter((c) => c && !OBJECT_ID_CLASS.test(c));
  }

  /** Scan the page into the same shape the contract exposes (cached). */
  function scan() {
    if (cache) return cache;

    const courseId = courseIdFromUrl();
    // Diagnostics accumulators: rows grouped by their MEANINGFUL classes, and the
    // distinct class sets of their parents (to catch container-level markers).
    const rowTokenSets = [];
    const parentClassSet = new Set();
    const allContainers = pickAll(
      getCourseElement(),
      CF.selectors.SELECTORS.moduleContainer,
      "moduleContainer"
    );
    const containers = allContainers.filter((container) => {
      // Drop Canvas "shell" containers: an empty title AND no item rows. They match
      // `.context_module` but are not real modules (they'd render as a blank group).
      const titleEl = peek(container, CF.selectors.SELECTORS.moduleTitle);
      const hasTitle = !!(titleEl && (titleEl.textContent || "").trim());
      const hasRows = !!peek(container, CF.selectors.SELECTORS.itemRow);
      return hasTitle || hasRows;
    });
    const droppedShells = allContainers.length - containers.length;

    const modules = containers.map((container, index) => {
      const idMatch = (container.id || "").match(MODULE_ID_RE);
      const moduleId = idMatch ? idMatch[1] : `idx-${index}`;
      const titleEl = pick(container, CF.selectors.SELECTORS.moduleTitle, "moduleTitle");
      const title = ((titleEl || container).textContent || "").trim();

      const rows = pickAll(container, CF.selectors.SELECTORS.itemRow, "itemRow");
      for (const row of rows) {
        rowTokenSets.push(classTokens(row.className));
        const parent = row.parentElement;
        if (parent && typeof parent.className === "string" && parent.className.trim()) {
          parentClassSet.add(classTokens(parent.className).sort().join(" "));
        }
      }
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
      note:
        `completion: ${completed}/${items.length} confirmed` +
        (droppedShells ? ` · skipped ${droppedShells} empty container(s)` : ""),
    });

    // Name any module that yielded no items — usually one Canvas hasn't finished
    // rendering yet (or a genuinely empty module); the route observer re-scans.
    const emptyModules = modules.filter((m) => m.items.length === 0).map((m) => m.title);
    if (emptyModules.length) {
      CF.debugReport("modulesWithoutItems", { ok: true, matched: JSON.stringify(emptyModules) });
    }

    // Classes that appear on SOME rows but not all — i.e. what makes rows differ.
    // If completed rows carry a marker we don't yet use, it shows up here.
    if (rowTokenSets.length) {
      const freq = new Map();
      for (const tokens of rowTokenSets) {
        for (const token of new Set(tokens)) freq.set(token, (freq.get(token) || 0) + 1);
      }
      const total = rowTokenSets.length;
      const rank = (token) => (/complete/i.test(token) ? 0 : 1);
      const distinguishing = [...freq.entries()]
        .filter(([, n]) => n < total)
        .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([token, n]) => `${token}×${n}`);
      CF.debugReport("itemRowClasses", {
        ok: true,
        matched: JSON.stringify(distinguishing.slice(0, 20)),
        note: `${total} rows`,
      });
    }

    // Distinct class sets of the rows' PARENTS — catches completion indicated on a
    // wrapping element (e.g. a "completed items" container) rather than the row.
    if (parentClassSet.size) {
      CF.debugReport("itemParentClasses", {
        ok: true,
        matched: JSON.stringify([...parentClassSet].slice(0, 12)),
      });
    }

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
          return Promise.resolve([
            {
              id: data.courseId,
              name: data.courseName,
              // Short display name (e.g. "TOÁN") when the code string is recognised.
              shortName: CF.subjects.courseShortName(data.courseName),
              subjectKey: CF.subjects.subjectKeyFromText(data.courseName),
            },
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
