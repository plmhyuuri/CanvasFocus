/**
 * Selector registry + diagnostics tests.
 *
 * `pick()`/`pickAll()` only need an object with querySelector/querySelectorAll,
 * so the fallback + reporting contract is testable without jsdom.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

const CF = resetNamespace();
// selectors.js reports through util/browser.js's real aggregation, so load it
// (it resets CF.debug to false, so enable debug AFTER).
load("util/browser.js");
CF.debug = true;
load("canvas/selectors.js");
const { pick, pickAll, courseIdFromUrl, isModulesPage } = CF.selectors;

/** Minimal stand-in for a DOM root. `map` values: element or array of elements. */
function fakeRoot(map) {
  return {
    querySelector: (sel) => map[sel] || null,
    querySelectorAll: (sel) => map[sel] || [],
  };
}

function el(tag, className) {
  return { tagName: tag, className };
}

test("pick() returns the first matching selector and records no fallback note", () => {
  CF.resetDebugReports();
  const root = fakeRoot({ ".a": el("SPAN", "a") });
  const found = pick(root, [".a", ".b"], "field");
  assert.equal(found.className, "a");
  const report = CF.debugReports.get("field");
  assert.equal(report.ok, 1);
  assert.equal(report.matched, ".a");
  assert.equal(report.note, null, "primary selector should not produce a note");
});

test("pick() reports the element when a FALLBACK selector matches", () => {
  CF.resetDebugReports();
  const root = fakeRoot({ ".b": el("DIV", "completion_status completed") });
  const found = pick(root, [".a", ".b"], "itemCompletedMarker");
  assert.equal(found.className, "completion_status completed");
  const report = CF.debugReports.get("itemCompletedMarker");
  assert.equal(report.matched, ".b");
  assert.match(report.note, /fallback #2/);
  assert.match(report.note, /div\.completion_status\.completed/);
});

test("pick() reports a miss with the tried selectors", () => {
  CF.resetDebugReports();
  pick(fakeRoot({}), [".x", ".y"], "gone");
  const report = CF.debugReports.get("gone");
  assert.equal(report.miss, 1);
  assert.deepEqual(report.tried, [".x", ".y"]);
});

test("pickAll() returns matches from the first selector that hits", () => {
  CF.resetDebugReports();
  const root = fakeRoot({ ".row": [el("LI", "row"), el("LI", "row")] });
  const nodes = pickAll(root, [".none", ".row"], "itemRow");
  assert.equal(nodes.length, 2);
  assert.equal(CF.debugReports.get("itemRow").ok, 1);
});

test("diagnostics aggregate across repeated lookups", () => {
  CF.resetDebugReports();
  const root = fakeRoot({ ".a": el("SPAN", "a") });
  pick(root, [".a"], "f");
  pick(root, [".a"], "f");
  pick(fakeRoot({}), [".a"], "f");
  const report = CF.debugReports.get("f");
  assert.equal(report.ok, 2);
  assert.equal(report.miss, 1);
});

test("courseIdFromUrl() extracts the id", () => {
  assert.equal(courseIdFromUrl("https://lms.vinschool.edu.vn/courses/12345/modules"), "12345");
  assert.equal(courseIdFromUrl("https://lms.vinschool.edu.vn/courses/9"), "9");
  assert.equal(courseIdFromUrl("https://lms.vinschool.edu.vn/dashboard"), null);
});

test("isModulesPage() matches only Modules URLs", () => {
  assert.equal(isModulesPage("https://x/courses/1/modules"), true);
  assert.equal(isModulesPage("https://x/courses/1/modules?debug"), true);
  assert.equal(isModulesPage("https://x/courses/1/modules/2"), true);
  assert.equal(isModulesPage("https://x/courses/1/assignments"), false);
  assert.equal(isModulesPage("https://x/courses/1/modulesx"), false);
});
