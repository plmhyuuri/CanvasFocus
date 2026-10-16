/**
 * CanvasFocus — week-number extraction from module titles.
 *
 * Faithful port of VinFocus's `extract_weeks_raw` (main.py) + WEEK_KEYWORD /
 * WEEK_SEPARATORS. Keep this in sync conceptually with VinFocus; if you fix a
 * parsing bug there, fix it here too.
 *
 * Behaviour (unchanged from VinFocus):
 *   1. Find the first week keyword ("tuần"/"tuan"/"week", case-insensitive).
 *   2. Walk the text after it, collecting numbers and separators.
 *   3. Ranges ("1-3", "1–3", "1=>3") expand; lists ("1,2", "1+2", "1&2", "1/2")
 *      accumulate.
 *   4. Stop at the first unrelated character (a letter, "(", ".", etc.).
 *
 * Example:  "Chương 2 - Tuần 3-5: Động lực học"  ->  [3, 4, 5]
 *           "Week 7 & 8"                          ->  [7, 8]
 *           "Ôn tập"                              ->  []
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /** "tuần" / "tuân" / "tuan" / "week" (matches VinFocus `WEEK_KEYWORD`). */
  const WEEK_KEYWORD = /(?:tu[âầa]?n|week)/i;

  /** Characters allowed inside a week expression (matches `WEEK_SEPARATORS`). */
  const WEEK_SEPARATORS = new Set(["-", "–", "+", "&", ",", "/", "=", ">", " "]);

  const RANGE_DASHES = new Set(["-", "–"]);

  /** Memo cache: module title -> number[] (replaces Python's lru_cache). */
  const cache = new Map();

  /**
   * @param {string} moduleName  module title text
   * @returns {number[]} sorted unique week numbers (empty when none found)
   */
  function extractWeeks(moduleName) {
    if (!moduleName) return [];
    if (cache.has(moduleName)) return cache.get(moduleName);

    const weeks = parseWeeks(String(moduleName));
    cache.set(moduleName, weeks);
    return weeks;
  }

  function parseWeeks(moduleName) {
    const name = moduleName.trim();
    if (!name) return [];

    const match = WEEK_KEYWORD.exec(name);
    if (!match) return [];

    // Tokenise the substring starting at the keyword.
    const tail = name.slice(match.index);
    const tokens = [];
    let i = match[0].length; // skip past the keyword itself

    while (i < tail.length) {
      const ch = tail[i];

      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if (ch >= "0" && ch <= "9") {
        let j = i;
        while (j < tail.length && tail[j] >= "0" && tail[j] <= "9") j += 1;
        tokens.push({ type: "num", value: tail.slice(i, j) });
        i = j;
        continue;
      }
      if (WEEK_SEPARATORS.has(ch)) {
        tokens.push({ type: "sep", value: ch });
        i += 1;
        continue;
      }
      break; // first unrelated character ends the expression
    }

    if (!tokens.length) return [];

    const weeks = [];
    i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token.type !== "num") {
        i += 1;
        continue;
      }

      const num = parseInt(token.value, 10);

      // Range: "n - m" / "n – m"
      if (
        i + 2 < tokens.length &&
        tokens[i + 1].type === "sep" &&
        RANGE_DASHES.has(tokens[i + 1].value) &&
        tokens[i + 2].type === "num"
      ) {
        weeks.push(...expandRange(num, parseInt(tokens[i + 2].value, 10)));
        i += 3;
        continue;
      }

      // Range written as "=>" (two separator tokens: "=" then ">")
      if (
        i + 3 < tokens.length &&
        tokens[i + 1].type === "sep" && tokens[i + 1].value === "=" &&
        tokens[i + 2].type === "sep" && tokens[i + 2].value === ">" &&
        tokens[i + 3].type === "num"
      ) {
        weeks.push(...expandRange(num, parseInt(tokens[i + 3].value, 10)));
        i += 4;
        continue;
      }

      weeks.push(num);
      i += 1;
    }

    return Array.from(new Set(weeks)).sort((a, b) => a - b);
  }

  /** Ascending ranges expand; descending ranges keep both endpoints (VinFocus parity). */
  function expandRange(start, end) {
    if (start < end) {
      const out = [];
      for (let n = start; n <= end; n += 1) out.push(n);
      return out;
    }
    return [start, end];
  }

  /** Clear the memo cache (used by the diagnostics "re-scan" action). */
  function clearCache() {
    cache.clear();
  }

  CF.weeks = { extractWeeks, clearCache, WEEK_KEYWORD };
})();
