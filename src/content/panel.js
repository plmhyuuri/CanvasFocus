/**
 * CanvasFocus — in-page panel (Shadow-DOM sidebar).
 *
 * Builds the UI inside a closed-off ShadowRoot so Canvas's CSS cannot leak in and
 * ours cannot leak out. All data comes through the provider contract
 * (providers/index.js) — this file never touches the DOM to READ Canvas content.
 *
 * Responsibilities:
 *   - mount/destroy the host + ShadowRoot
 *   - render the searchable, week-grouped item list
 *   - reveal the real Canvas row on click (delegates to the provider)
 *   - persist open/closed state and language
 *   - render the `?debug` diagnostics overlay
 *
 * Depends on: util/browser.js, canvas/*, i18n/*, providers/*, panel.css.js.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  const t = (key, vars) => CF.i18n.t(key, vars);

  /** Icon + i18n key per Canvas item type (see selectors.js ITEM_TYPES). */
  const TYPE_META = {
    assignment: { icon: "📝", key: "typeAssignment" },
    quiz: { icon: "❓", key: "typeQuiz" },
    discussion: { icon: "💬", key: "typeDiscussion" },
    page: { icon: "📄", key: "typePage" },
    external_tool: { icon: "🧩", key: "typeExternalTool" },
    external_url: { icon: "🔗", key: "typeExternalUrl" },
    file: { icon: "📎", key: "typeFile" },
    subheader: { icon: "▸", key: "typeSubheader" },
    unknown: { icon: "•", key: "typeUnknown" },
  };

  const state = {
    open: false,
    debug: false,
    query: "",
    course: null,
    modules: [],
    counts: { modules: 0, items: 0, weeks: 0 },
    onModulesPage: false,
  };

  let host = null;
  let shadow = null;
  let refs = {};
  let mounted = false;

  // ---------------------------------------------------------------------------
  // Mount
  // ---------------------------------------------------------------------------

  function mount() {
    if (mounted) return;
    mounted = true;

    host = document.createElement("div");
    host.id = "canvasfocus-host";
    shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = CF.panelCss;
    shadow.appendChild(style);

    const root = document.createElement("div");
    root.className = "cf-root";
    root.innerHTML = `
      <button class="cf-fab cf-fab--hidden" type="button">CF</button>
      <aside class="cf-panel" aria-hidden="true">
        <div class="cf-head">
          <div class="cf-head-text">
            <div class="cf-title"></div>
            <div class="cf-subtitle"></div>
          </div>
          <button class="cf-icon-btn cf-close" type="button">×</button>
        </div>
        <div class="cf-search-wrap">
          <input class="cf-search" type="search" />
        </div>
        <div class="cf-body"></div>
        <div class="cf-foot">
          <span class="cf-brand">CanvasFocus</span>
          <span class="cf-foot-spacer"></span>
          <button class="cf-refresh" type="button"></button>
          <button class="cf-debug-toggle" type="button"></button>
        </div>
      </aside>
      <div class="cf-debug cf-debug--hidden"></div>
    `;
    shadow.appendChild(root);

    refs = {
      fab: root.querySelector(".cf-fab"),
      panel: root.querySelector(".cf-panel"),
      title: root.querySelector(".cf-title"),
      subtitle: root.querySelector(".cf-subtitle"),
      close: root.querySelector(".cf-close"),
      search: root.querySelector(".cf-search"),
      body: root.querySelector(".cf-body"),
      refresh: root.querySelector(".cf-refresh"),
      debugToggle: root.querySelector(".cf-debug-toggle"),
      debug: root.querySelector(".cf-debug"),
    };

    injectRevealStyle();
    wireEvents();
    applyStaticStrings();
    document.documentElement.appendChild(host);

    // Restore persisted open state (default: collapsed).
    CF.storage.get(CF.KEYS.panelOpen, false).then((open) => setOpen(Boolean(open)));
  }

  /**
   * The `.cf-reveal-flash` class is applied to a REAL Canvas element (outside the
   * Shadow DOM), so its rule must live in the page, not in the ShadowRoot.
   */
  function injectRevealStyle() {
    if (document.getElementById("canvasfocus-page-style")) return;
    const style = document.createElement("style");
    style.id = "canvasfocus-page-style";
    style.textContent = `
      .cf-reveal-flash {
        outline: 2px solid #255fbf !important;
        outline-offset: 2px;
        border-radius: 6px;
        transition: outline-color 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function wireEvents() {
    refs.fab.addEventListener("click", () => setOpen(!state.open));
    refs.close.addEventListener("click", () => setOpen(false));
    refs.refresh.addEventListener("click", () => refresh());
    refs.debugToggle.addEventListener("click", toggleDebug);

    refs.search.addEventListener(
      "input",
      CF.debounce(() => {
        state.query = refs.search.value.trim().toLowerCase();
        renderList();
      }, 120)
    );

    // Keyboard: Escape closes the panel.
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    CF.i18n.onLanguageChange(() => {
      applyStaticStrings();
      renderHeader();
      renderList();
      renderDebug();
    });
  }

  function applyStaticStrings() {
    if (!refs.panel) return;
    refs.fab.title = t("open");
    refs.fab.setAttribute("aria-label", t("open"));
    refs.close.title = t("close");
    refs.close.setAttribute("aria-label", t("close"));
    refs.search.placeholder = t("searchPlaceholder");
    refs.refresh.textContent = t("refresh");
    refs.debugToggle.textContent = t("diagnostics");
    refs.debugToggle.title = t("diagnosticsOn");
  }

  function setOpen(open) {
    state.open = open;
    if (refs.panel) {
      refs.panel.classList.toggle("cf-panel--open", open);
      refs.panel.setAttribute("aria-hidden", String(!open));
    }
    if (refs.fab) {
      refs.fab.classList.toggle("cf-fab--hidden", open || !state.onModulesPage);
    }
    CF.storage.set(CF.KEYS.panelOpen, open);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /**
   * Reads everything through the provider contract. Recomputed weeks (if a
   * provider does not supply them) so B2 works without changes.
   */
  async function loadData() {
    const provider = CF.providers.get();
    if (typeof provider.invalidate === "function") provider.invalidate();
    CF.weeks.clearCache();
    CF.resetDebugReports();

    const courses = await provider.getCourses();
    const course = courses[0] || null;
    const modules = course ? await provider.getModules(course.id) : [];

    for (const module of modules) {
      module.items = await provider.getItems(course.id, module.id);
      if (!module.weeks || !module.weeks.length) {
        module.weeks = CF.weeks.extractWeeks(module.title);
      }
    }

    state.course = course;
    state.modules = modules;
    state.counts = {
      modules: modules.length,
      items: modules.reduce((n, m) => n + m.items.length, 0),
      weeks: modules.reduce((n, m) => n + Math.max(1, m.weeks.length), 0),
    };
  }

  /** Re-read the page and re-render (always a fresh scan — see loadData). */
  async function refresh() {
    if (!state.onModulesPage) return;
    try {
      await loadData();
    } catch (err) {
      CF.error("failed to load Canvas data", err);
      state.modules = [];
    }
    renderHeader();
    renderList();
    renderDebug();
  }

  // ---------------------------------------------------------------------------
  // Grouping (week buckets + "Other")
  // ---------------------------------------------------------------------------

  /**
   * Flatten modules into week buckets. An item whose module covers several weeks
   * appears in each of them. Items in modules with no week info go to "Other".
   * @returns {Array<{key:string,label:string,items:Array}>}
   */
  function buildGroups() {
    const byWeek = new Map();
    const other = [];

    for (const module of state.modules) {
      for (const item of module.items) {
        const entry = { item, moduleTitle: module.title, weeks: module.weeks || [] };
        if (module.weeks && module.weeks.length) {
          for (const week of module.weeks) {
            if (!byWeek.has(week)) byWeek.set(week, []);
            byWeek.get(week).push(entry);
          }
        } else {
          other.push(entry);
        }
      }
    }

    const groups = Array.from(byWeek.keys())
      .sort((a, b) => a - b)
      .map((week) => ({
        key: `w${week}`,
        label: t("weekLabel", { n: week }),
        items: byWeek.get(week),
      }));

    if (other.length) groups.push({ key: "other", label: t("groupOther"), items: other });
    return groups;
  }

  function matchesQuery(entry) {
    if (!state.query) return true;
    const hay = `${entry.item.title} ${entry.moduleTitle}`.toLowerCase();
    return hay.includes(state.query);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function renderHeader() {
    if (!refs.title) return;
    const course = state.course;
    // Prefer a short subject name ("TOÁN") over the full Canvas code string
    // ("THAOBTP6-TOÁN-10-THPT-OCEAN PARK-2026 - 2027"); the full name is the tooltip.
    const short = course && course.shortName ? course.shortName.trim() : "";
    const full = course && course.name ? course.name.trim() : "";
    refs.title.textContent = short || full || t("panelTitle");
    refs.title.title = full;

    const subjectLabel = course && course.subjectKey
      ? CF.subjects.getSubjectLabel(course.subjectKey)
      : "";
    const subtitle = [];
    // Don't repeat the subject when the title already IS the subject.
    if (!short && subjectLabel) subtitle.push(subjectLabel);
    subtitle.push(countLabel(state.counts.items));
    refs.subtitle.textContent = subtitle.filter(Boolean).join(" · ");
  }

  function countLabel(n) {
    return n === 1 ? t("itemCountOne") : t("itemCount", { n });
  }

  function renderList() {
    if (!refs.body) return;
    refs.body.textContent = "";

    if (!state.onModulesPage) {
      refs.body.appendChild(emptyEl(t("emptyNotModules")));
      return;
    }
    if (state.counts.items === 0) {
      refs.body.appendChild(emptyEl(t("emptyNoItems")));
      return;
    }

    const groups = buildGroups();
    const provider = CF.providers.get();
    let visibleTotal = 0;

    for (const group of groups) {
      const visible = group.items.filter(matchesQuery);
      if (!visible.length) continue;
      visibleTotal += visible.length;

      const section = document.createElement("section");
      section.className = "cf-group";

      const heading = document.createElement("div");
      heading.className = "cf-group-title";
      heading.textContent = `${group.label} · ${countLabel(visible.length)}`;
      section.appendChild(heading);

      for (const entry of visible) section.appendChild(renderItem(entry, provider));
      refs.body.appendChild(section);
    }

    if (visibleTotal === 0) {
      refs.body.appendChild(emptyEl(t("emptySearch", { q: state.query })));
    }
  }

  function renderItem(entry, provider) {
    const { item, moduleTitle, weeks } = entry;
    const meta = TYPE_META[item.type] || TYPE_META.unknown;

    // Canvas "subheader" rows are section labels, not links — render them as
    // inert labels so users aren't offered a click that does nothing.
    if (item.type === "subheader") {
      const label = document.createElement("div");
      label.className = "cf-item cf-item--subheader";
      label.textContent = item.title;
      return label;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cf-item" + (item.completed ? " cf-item--done" : "");
    button.title = item.title;

    const icon = document.createElement("span");
    icon.className = "cf-item-icon";
    icon.textContent = meta.icon;
    button.appendChild(icon);

    const body = document.createElement("span");
    body.className = "cf-item-body";

    const title = document.createElement("span");
    title.className = "cf-item-title";
    title.textContent = item.title;
    body.appendChild(title);

    const sub = document.createElement("span");
    sub.className = "cf-item-meta";
    sub.textContent = `${moduleTitle} · ${t(meta.key)}`;
    body.appendChild(sub);
    button.appendChild(body);

    if (weeks.length > 1) {
      const badge = document.createElement("span");
      badge.className = "cf-badge";
      badge.textContent = weeks.join(", ");
      button.appendChild(badge);
    }

    // Completion: we only ever assert a positive ✓. Canvas doesn't always expose
    // completion state (teachers may not enable tracking), so the absence of a
    // marker is NOT rendered as "not completed" — it's simply left blank.
    if (item.completed) {
      const check = document.createElement("span");
      check.className = "cf-check";
      check.textContent = "✓";
      check.title = t("completed");
      button.appendChild(check);
    }

    button.addEventListener("click", () => {
      if (typeof provider.reveal === "function") {
        provider.reveal(item);
      } else if (item.url) {
        globalThis.open(item.url, "_blank", "noopener");
      }
    });

    return button;
  }

  function emptyEl(text) {
    const el = document.createElement("div");
    el.className = "cf-empty";
    el.textContent = text;
    return el;
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  async function toggleDebug() {
    state.debug = !state.debug;
    CF.debug = state.debug;
    await CF.storage.set(CF.KEYS.debug, state.debug);
    renderDebug();
    if (state.debug) refresh();
  }

  function renderDebug() {
    if (!refs.debug) return;
    refs.debug.classList.toggle("cf-debug--hidden", !state.debug);
    if (!state.debug) return;

    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = t("diagnostics");
    wrap.appendChild(heading);

    const counts = document.createElement("div");
    counts.className = "cf-dim";
    counts.textContent = `${t("debugCounts")}: ${state.counts.modules} modules · ${state.counts.items} items`;
    wrap.appendChild(counts);

    // Aggregated per field, so a 100-item course stays readable. Misses first —
    // they are the actionable ones.
    const reports = Array.from((CF.debugReports || new Map()).values());
    if (!reports.length) {
      const none = document.createElement("div");
      none.className = "cf-dim";
      none.textContent = t("debugNone");
      wrap.appendChild(none);
    } else {
      reports.sort((a, b) => (a.miss > 0 ? 0 : 1) - (b.miss > 0 ? 0 : 1) || a.label.localeCompare(b.label));

      for (const report of reports) {
        const line = document.createElement("div");

        const status = document.createElement("span");
        const miss = report.miss > 0;
        status.className = miss ? "cf-bad" : "cf-ok";
        // e.g. "[OK x104]" / "[MISS x3]"
        status.textContent = miss
          ? `[MISS x${report.miss}] `
          : `[OK x${report.ok}] `;
        line.appendChild(status);

        const label = document.createElement("span");
        label.textContent = `${report.label}: `;
        line.appendChild(label);

        const detail = document.createElement("code");
        if (miss) {
          const tried = report.tried || [];
          detail.textContent = tried.length ? `none of ${tried.join(", ")}` : "no signal";
        } else {
          detail.textContent = report.matched;
        }
        line.appendChild(detail);

        if (report.note) {
          const note = document.createElement("span");
          note.className = "cf-dim";
          note.textContent = `  ← ${report.note}`;
          line.appendChild(note);
        }
        wrap.appendChild(line);
      }
    }

    const hint = document.createElement("div");
    hint.className = "cf-dim";
    hint.style.marginTop = "6px";
    hint.textContent = t("debugHint");
    wrap.appendChild(hint);

    refs.debug.textContent = "";
    refs.debug.appendChild(wrap);
  }

  // ---------------------------------------------------------------------------
  // Route lifecycle
  // ---------------------------------------------------------------------------

  function onRouteChange() {
    const onModules = CF.selectors.isModulesPage();
    const toggled = onModules !== state.onModulesPage;
    state.onModulesPage = onModules;

    if (!onModules) {
      // Nothing to enhance here — hide quietly, keep state for when we return.
      if (host) host.style.display = "none";
      state.course = null;
      state.modules = [];
      state.counts = { modules: 0, items: 0, weeks: 0 };
      return;
    }

    if (host) host.style.display = "";
    refs.fab.classList.toggle("cf-fab--hidden", state.open);
    // Fresh page: drop any previous search and force a re-scan.
    if (toggled) state.query = "";
    if (refs.search) refs.search.value = state.query;
    refresh();
  }

  CF.panel = {
    mount,
    onRouteChange,
    refresh,
    setOpen,
    state,
  };
})();
