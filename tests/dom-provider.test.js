/**
 * DOM provider tests — no jsdom required.
 *
 * providers/dom.js only ever reads its content through `querySelector`/
 * `querySelectorAll`, so a fake element tree exercises the real parsing logic
 * (types, completion semantics, course-name resolution) without a DOM engine.
 *
 * The completion tests matter most: they pin the rule that a
 * `<span class="completion_requirement">` (a requirement DESCRIPTION) must NOT be
 * read as completed state, because teachers don't always enable tracking.
 */
"use strict";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

/** Minimal fake element supporting the API surface pick()/dom.js use. */
function el(opts = {}) {
  const {
    tag = "DIV",
    className = "",
    id = "",
    text = "",
    href = null,
    attrs = {},
    children = {},
  } = opts;
  const classes = className.split(/\s+/).filter(Boolean);
  const node = {
    tagName: tag,
    className,
    id,
    textContent: text,
    href,
    classList: { contains: (c) => classes.includes(c) },
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    // Real DOM semantics: querySelector returns ONE element or null, so an empty
    // child list must yield null (not `[]`, which is truthy).
    querySelector: (sel) => {
      const value = children[sel];
      if (Array.isArray(value)) return value[0] || null;
      return value || null;
    },
    querySelectorAll: (sel) => children[sel] || [],
    closest: () => null,
  };
  // Wire parentElement so ancestor-based diagnostics have something to read.
  for (const value of Object.values(children)) {
    const list = Array.isArray(value) ? value : [value];
    for (const child of list) if (child && typeof child === "object") child.parentElement = node;
  }
  return node;
}

/** A module row factory; `completed` flags drive expected output. */
function makeRow({ id, type, title, completedMarker, hasRequirement }) {
  const children = {
    ".item_name .ig-title": el({ tag: "A", className: "ig-title", text: title }),
    ".item_name a": el({ tag: "A", className: "ig-title", href: `/courses/9/${id}` }),
  };
  if (completedMarker) children[completedMarker.selector] = completedMarker.el;
  if (hasRequirement) {
    // Present on incomplete items too — must be ignored as a state signal.
    children[".completion_requirement"] = el({
      tag: "SPAN",
      className: "completion_requirement",
      text: "Must view the page",
    });
  }
  return el({ tag: "LI", id, className: `context_module_item ${type}`, children });
}

function makeModule({ id, title, rows }) {
  return el({
    tag: "DIV",
    id,
    className: "context_module",
    children: {
      ".ig-header-title": el({ tag: "H2", className: "ig-header-title", text: title }),
      "li.context_module_item": rows,
      ".context_module_item": rows,
    },
  });
}

let CF;
let provider;
let modules;
let crumbs;

function installGlobals() {
  const doc = {
    title: "Modules: FALLBACK COURSE",
    querySelector: (sel) =>
      ({ ".context_module": modules, ".ic-app-crumbs a": crumbs }[sel] || null),
    querySelectorAll: (sel) =>
      ({ ".context_module": modules, ".ic-app-crumbs a": crumbs }[sel] || []),
  };
  globalThis.document = doc;
  globalThis.location = { href: "https://lms.vinschool.edu.vn/courses/9/modules" };
}

beforeEach(() => {
  CF = resetNamespace();
  CF.debug = false;
  load("util/browser.js");
  load("i18n/en.js");
  load("i18n/index.js");
  load("canvas/selectors.js");
  load("canvas/weeks.js");
  load("canvas/subjects.js");
  load("providers/index.js");
});

function buildProvider() {
  installGlobals();
  // dom.js registers itself on the namespace when loaded.
  load("providers/dom.js");
  return CF.providers.select("dom");
}

test("parses modules, weeks, item types and completion conservatively", async () => {
  modules = [
    makeModule({
      id: "context_module_111",
      title: "Chương 1 - Tuần 1-2",
      rows: [
        // completed via the row-level class
        el({
          tag: "LI",
          id: "a",
          className: "context_module_item assignment completed_item",
          children: {
            ".item_name .ig-title": el({ tag: "A", className: "ig-title", text: "Bài tập 1" }),
            ".item_name a": el({ tag: "A", className: "ig-title", href: "/1" }),
          },
        }),
        // INCOMPLETE, but has a completion_requirement description -> must be false
        makeRow({ id: "b", type: "page", title: "Bài đọc", hasRequirement: true }),
        // completed via an explicit marker element
        makeRow({
          id: "c",
          type: "quiz",
          title: "Kiểm tra",
          completedMarker: {
            selector: ".completion_status.completed",
            el: el({ tag: "SPAN", className: "completion_status completed" }),
          },
        }),
      ],
    }),
  ];
  crumbs = [el({ tag: "A", className: "crumb" }), el({ tag: "A", className: "crumb", text: "TOÁN 10" })];

  provider = buildProvider();
  const [course] = await provider.getCourses();
  assert.equal(course.id, "9");
  assert.equal(course.name, "TOÁN 10", "picks the crumb with a real name, skipping the icon-only one");

  const mods = await provider.getModules("9");
  assert.equal(mods.length, 1);
  assert.deepEqual(mods[0].weeks, [1, 2]);

  const items = await provider.getItems("9", "111");
  assert.deepEqual(
    items.map((i) => i.completed),
    [true, false, true],
    "row class ✓, requirement-only ✗, explicit marker ✓"
  );
  assert.deepEqual(items.map((i) => i.type), ["assignment", "page", "quiz"]);
  assert.deepEqual(items.map((i) => i.title), ["Bài tập 1", "Bài đọc", "Kiểm tra"]);
});

test("ignores the '…' overflow crumb and icon-only crumbs", async () => {
  modules = [makeModule({ id: "context_module_1", title: "Tuần 1", rows: [] })];
  // ellipsis toggle LAST (the old code returned it); icon-only first.
  crumbs = [
    el({ tag: "A", className: "crumb" }),
    el({ tag: "A", className: "crumb", text: "TOÁN 10" }),
    el({ tag: "A", className: "crumb", text: "…" }),
  ];
  provider = buildProvider();
  const [course] = await provider.getCourses();
  assert.equal(course.name, "TOÁN 10");
});

test("prefers a course name over a page word from the title", async () => {
  modules = [makeModule({ id: "context_module_1", title: "Tuần 1", rows: [] })];
  crumbs = [el({ tag: "A", className: "crumb", text: "Modules" })];
  provider = buildProvider();
  globalThis.document.title = "Modules: TOÁN 10";
  const [course] = await provider.getCourses();
  assert.equal(course.name, "TOÁN 10", "drops the page word, keeps the course");
});

test("falls back to document.title (part after the first colon) when no crumbs", async () => {
  modules = [makeModule({ id: "context_module_1", title: "Tuần 3", rows: [] })];
  crumbs = [];
  provider = buildProvider();
  const [course] = await provider.getCourses();
  assert.equal(course.name, "FALLBACK COURSE");
  assert.equal(course.shortName, null, "nothing safe to shorten a plain name to");
});

test("exposes a short subject name derived from the Canvas code string", async () => {
  modules = [makeModule({ id: "context_module_1", title: "Tuần 1", rows: [] })];
  crumbs = [
    el({
      tag: "A",
      className: "crumb",
      text: "THAOBTP6-TOÁN-10-THPT-OCEAN PARK-2026 - 2027",
    }),
  ];
  provider = buildProvider();
  const [course] = await provider.getCourses();
  assert.equal(course.name, "THAOBTP6-TOÁN-10-THPT-OCEAN PARK-2026 - 2027");
  assert.equal(course.shortName, "TOÁN", "second dash segment, recognised subject");
  assert.equal(course.subjectKey, "MATHS");
});

test("reports distinguishing row/parent classes and drops empty-titled shells", async () => {
  modules = [
    makeModule({
      id: "context_module_1",
      title: "Tuần 1",
      rows: [
        makeRow({ id: "a", type: "page", title: "P" }),
        makeRow({ id: "b", type: "quiz", title: "Q" }),
        makeRow({
          id: "c",
          type: "quiz",
          title: "Q2",
          completedMarker: {
            selector: ".completion_status.completed",
            el: el({ tag: "SPAN", className: "completion_status completed" }),
          },
        }),
      ],
    }),
    makeModule({ id: "context_module_2", title: "", rows: [] }), // shell -> dropped
    makeModule({ id: "context_module_3", title: "Tuần 9", rows: [] }), // real empty -> kept
  ];
  crumbs = [el({ tag: "A", className: "crumb", text: "TOÁN 10" })];
  provider = buildProvider();
  CF.debug = true;

  const mods = await provider.getModules("9");
  assert.equal(mods.length, 2, "the empty-titled shell is not treated as a module");

  const classes = CF.debugReports.get("itemRowClasses");
  assert.match(classes.matched, /quiz×2/, "class shared by some rows reports its count");
  assert.match(classes.matched, /page×1/, "class unique to one row is listed");
  assert.doesNotMatch(classes.matched, /context_module_item/, "classes on ALL rows are excluded");

  const empty = CF.debugReports.get("modulesWithoutItems");
  assert.equal(empty.matched, JSON.stringify(["Tuần 9"]), "shell excluded, real empty module kept");

  const scan = CF.debugReports.get("scan");
  assert.match(scan.note, /skipped 1 empty container/, "shell skip is visible in the scan line");
});

test("getCompletion() maps every item id to its boolean", async () => {
  modules = [
    makeModule({
      id: "context_module_222",
      title: "Ôn tập",
      rows: [makeRow({ id: "x", type: "page", title: "P", hasRequirement: true })],
    }),
  ];
  crumbs = [];
  provider = buildProvider();
  const completion = await provider.getCompletion("9");
  assert.deepEqual(completion, { x: false });
});
