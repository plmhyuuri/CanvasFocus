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

// Real module titles observed on the live Vinschool page (uppercase "TUẦN").
const LIVE_TITLES = [
  ["Tuần 9 BÀI 3.5. TỈ LỆ THỨC", [9]],
  ["TUẦN 7 - BÀI 2.3. HÀM SỐ VÀ KÍ HIỆU HÀM SỐ", [7]],
  ["TUẦN 5+6 - BÀI 2.1. LẬP PHƯƠNG TRÌNH ĐỂ GIẢI BÀI TOÁN", [5, 6]],
  ["TUẦN 4+5 - BÀI 1.7. HÀM ĐẠO HÀM", [4, 5]],
  ["TUẦN 3+4 - BÀI 1.6. Tìm độ dốc của một đường cong", [3, 4]],
  ["TUẦN 2+3 - BÀI 1.5. CÁC ĐỒ THỊ PHI TUYẾN TÍNH KHÁC", [2, 3]],
  ["TUẦN 2 - Bài 1.4. Sử dụng đồ thị…", [2]],
  ["TUẦN 1 BÀI 1.1. VẼ ĐỒ THỊ BẬC HAI (PARABOL)", [1]],
  ["BÀI 2.6. TỈ LỆ THUẬN VÀ TỈ LỆ NGHỊCH TRONG ĐẠI SỐ", []],
];

for (const [input, expected] of LIVE_TITLES) {
  test(`live title ${JSON.stringify(input)} -> [${expected}]`, () => {
    assert.deepEqual(extractWeeks(input), expected);
  });
}
