/**
 * Week-parsing tests.
 *
 * These expectations are the SAME cases verified against VinFocus's Python
 * `extract_weeks_raw` (0 mismatches across 20 cases). If you change weeks.js and
 * these fail, you have broken parity with VinFocus — check there before
 * "fixing" the expectation.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

resetNamespace();
load("canvas/weeks.js");
const { extractWeeks } = globalThis.__canvasFocus.weeks;

const CASES = [
  ["Chương 2 - Tuần 3-5: Động lực học", [3, 4, 5]],
  ["Week 7 & 8", [7, 8]],
  ["Ôn tập", []],
  ["Tuần 1, 2, 3", [1, 2, 3]],
  ["tuần 9 => 11", [9, 10, 11]],
  ["Week 5-3", [3, 5]],
  ["Tuần 4 (ôn tập)", [4]],
  ["Tuần 12/13", [12, 13]],
  ["TUẦN 2", [2]],
  ["Tuần", []],
  ["tuan 6", [6]],
  ["Chương 1: Week 2+4+6", [2, 4, 6]],
  ["📚 Tuần 10–12", [10, 11, 12]],
  ["Tuần 3–", [3]],
  ["Tuần -5", [5]],
  ["", []],
  ["   ", []],
  ["Bài 1 tuần 2 3", [2, 3]],
  ["Tuần 2(3)", [2]],
  ["WEEK 1 => 4 & 7", [1, 2, 3, 4, 7]],
];

for (const [input, expected] of CASES) {
  test(`extractWeeks(${JSON.stringify(input)}) -> [${expected}]`, () => {
    assert.deepEqual(extractWeeks(input), expected);
  });
}

test("results are cached and stable", () => {
  const a = extractWeeks("Tuần 6-7");
  const b = extractWeeks("Tuần 6-7");
  assert.deepEqual(a, [6, 7]);
  assert.equal(a, b, "same array instance returned from the memo cache");
});
