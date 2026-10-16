/**
 * Subject mapping tests (ported from VinFocus).
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

const CF = resetNamespace();
load("i18n/en.js");
load("i18n/vi.js");
load("i18n/index.js");
load("canvas/subjects.js");

const { SUBJECT_LABELS, SUBJECT_NAME_TO_KEY, getSubjectLabel, subjectKeyFromText } =
  CF.subjects;

test("en and vi label tables cover the same subject keys", () => {
  assert.deepEqual(Object.keys(SUBJECT_LABELS.en).sort(), Object.keys(SUBJECT_LABELS.vi).sort());
});

test("every Vietnamese name maps to a key that has labels", () => {
  for (const [name, key] of Object.entries(SUBJECT_NAME_TO_KEY)) {
    assert.ok(SUBJECT_LABELS.en[key], `no EN label for key "${key}" (from "${name}")`);
    assert.ok(SUBJECT_LABELS.vi[key], `no VI label for key "${key}" (from "${name}")`);
  }
});

test("subjectKeyFromText finds the key inside a course name", () => {
  assert.equal(subjectKeyFromText("HANGVM5-CÔNG DÂN TOÀN CẦU-10-2026 - 2027"), "GCED");
  assert.equal(subjectKeyFromText("TRANGPT68-HÓA HỌC-10-THPT-OCEAN PARK-2026 - 2027"), "CHEM");
  assert.equal(subjectKeyFromText("Ngữ Văn 10"), "NV", "case is normalized, diacritics preserved");
  assert.equal(subjectKeyFromText("NGỮ VĂN 10"), "NV");
  assert.equal(subjectKeyFromText("English (Local Teachers)"), "ESL (GVVN)");
  assert.equal(subjectKeyFromText("Lớp 10A1"), null);
  assert.equal(subjectKeyFromText(""), null);
});

/**
 * KNOWN LIMITATION (characterization test — not a bug report).
 *
 * subjectKeyFromText() does substring matching over the course name. Because
 * "KHÓA HỌC" ("course") contains "HÓA HỌC" ("chemistry"), a generic course name
 * can mis-resolve. This is acceptable for B1: the result is only used for a
 * decorative header label, and the raw course name is always shown regardless.
 *
 * If subject grouping ever becomes load-bearing (e.g. B2 filters/groups by
 * subject), replace this with a tokenized/anchored match before relying on it.
 */
test("substring caveat: generic name can mis-resolve (header label only)", () => {
  assert.equal(subjectKeyFromText("KHÓA HỌC BÌNH THƯỜNG"), "CHEM");
});

test("getSubjectLabel localizes and falls back to the key", () => {
  assert.equal(getSubjectLabel("MATHS", "en"), "Math");
  assert.equal(getSubjectLabel("MATHS", "vi"), "Toán");
  assert.equal(getSubjectLabel("UNKNOWN", "en"), "UNKNOWN");
  assert.equal(getSubjectLabel("", "en"), "");
});
