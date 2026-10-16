/**
 * i18n tests — the important one is key parity.
 *
 * The README tells contributors every key must exist in BOTH en.js and vi.js.
 * This test enforces it, so a missing translation fails CI instead of silently
 * rendering a raw key like "panelTitle" in the UI.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

const CF = resetNamespace();
load("i18n/en.js");
load("i18n/vi.js");
load("i18n/index.js");

const { en, vi } = CF.i18n.translations;

test("every language has strings", () => {
  assert.ok(Object.keys(en).length > 0, "en strings present");
  assert.ok(Object.keys(vi).length > 0, "vi strings present");
});

test("en and vi have identical key sets", () => {
  const enKeys = new Set(Object.keys(en));
  const viKeys = new Set(Object.keys(vi));
  const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
  const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
  assert.deepEqual(missingInVi, [], "keys present in en but missing in vi");
  assert.deepEqual(missingInEn, [], "keys present in vi but missing in en");
});

test("placeholder names match across languages for each key", () => {
  const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(en)) {
    assert.deepEqual(
      placeholders(vi[key]),
      placeholders(en[key]),
      `placeholder mismatch for "${key}"`
    );
  }
});

test("t() falls back to English for the active language", () => {
  assert.equal(CF.i18n.t("weekLabel", { n: 3 }), "Week 3");
});

test("t() substitutes placeholders and leaves unknown ones intact", () => {
  assert.equal(CF.i18n.t("itemCount", { n: 5 }), "5 items");
  assert.equal(CF.i18n.t("itemCount", {}), "{n} items");
});

test("t() returns the raw key when a string is missing", () => {
  assert.equal(CF.i18n.t("doesNotExist"), "doesNotExist");
});
