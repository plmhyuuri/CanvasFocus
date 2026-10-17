/**
 * CanvasFocus — subject keys and bilingual labels.
 *
 * Ported from VinFocus (`static/js/app.js`: SUBJECT_LABELS, SUBJECT_NAME_TO_KEY,
 * courseSubjectKey). Used to show a friendly subject label for the current course
 * in the panel header, when the course name/code can be mapped.
 *
 * Extend SUBJECT_NAME_TO_KEY as new Vietnamese course names appear.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  /** Canonical subject key -> localized label. */
  const SUBJECT_LABELS = {
    en: {
      MATHS: "Math",
      PHY: "Physics",
      CHEM: "Chemistry",
      BIO: "Biology",
      IT: "ICT",
      TECH: "Tech",
      GEO: "Geography",
      HIS: "History",
      CIVIC: "Civics",
      GCED: "GCED",
      CLISE: "CLISE",
      NV: "Literature",
      LOCE: "Local Studies",
      CAREER: "Career",
      VNS: "VNH",
      "ESL (GVVN)": "ESL (GVVN)",
      "ESL (GVNN)": "ESL (GVNN)",
      MUS: "Music",
      PE: "Sports",
      ART: "Art",
      "GDKT-PL": "Economics & Law",
    },
    vi: {
      MATHS: "Toán",
      PHY: "Vật Lý",
      CHEM: "Hóa Học",
      BIO: "Sinh Học",
      IT: "Tin Học",
      TECH: "Công Nghệ",
      GEO: "Địa Lý",
      HIS: "Lịch Sử",
      CIVIC: "GDCD",
      GCED: "GCED",
      CLISE: "CLISE",
      NV: "Ngữ Văn",
      LOCE: "ND-GDĐP",
      CAREER: "HĐTN-HN",
      VNS: "VNH",
      "ESL (GVVN)": "ESL (GVVN)",
      "ESL (GVNN)": "ESL (GVNN)",
      MUS: "Âm Nhạc",
      PE: "Thể Chất",
      ART: "Mỹ Thuật",
      "GDKT-PL": "GDKT & PL",
    },
  };

  /**
   * Vietnamese full subject names (as they appear in Canvas course codes/names,
   * e.g. "HANGVM5-CÔNG DÂN TOÀN CẦU-10-2026 - 2027") -> canonical key.
   */
  const SUBJECT_NAME_TO_KEY = {
    "CÔNG DÂN TOÀN CẦU": "GCED",
    "VẬT LÝ": "PHY",
    "LỊCH SỬ": "HIS",
    "ĐỊA LÝ": "GEO",
    "GIÁO DỤC THỂ CHẤT": "PE",
    "NGỮ VĂN": "NV",
    "CÔNG NGHỆ THÔNG TIN": "IT",
    "VIỆT NAM HỌC": "VNS",
    "GIÁO DỤC KỸ NĂNG PHẨM CHẤT": "CLISE",
    "TOÁN": "MATHS",
    "ÂM NHẠC": "MUS",
    "SINH HỌC": "BIO",
    "HÓA HỌC": "CHEM",
    "MĨ THUẬT": "ART",
    "ENGLISH (LOCAL TEACHERS)": "ESL (GVVN)",
    "ENGLISH (FOREIGN TEACHERS)": "ESL (GVNN)",
    "CÔNG NGHỆ": "TECH",
    "GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT": "GDKT-PL",
    "HOẠT ĐỘNG TRẢI NGHIỆM, HƯỚNG NGHIỆP": "CAREER",
  };

  /** Localized label for a subject key, falling back to the key itself. */
  function getSubjectLabel(key, language) {
    if (!key) return "";
    const lang = language || (CF.i18n && CF.i18n.getLanguage()) || "en";
    return (SUBJECT_LABELS[lang] && SUBJECT_LABELS[lang][key]) || key;
  }

  /**
   * Try to derive a subject key from arbitrary course text (name or code).
   * Looks for a known Vietnamese subject name inside the text. Returns null when
   * nothing matches — callers should then just show the raw course name.
   *
   * KNOWN LIMITATION: this is a loose substring match, so generic names can
   * false-positive ("KHÓA HỌC" contains "HÓA HỌC"). Fine while the result is only
   * a decorative label; tokenize/anchor the match before using it for anything
   * load-bearing. See tests/subjects.test.js for the characterization test.
   */
  function subjectKeyFromText(text) {
    if (!text) return null;
    const upper = String(text).toUpperCase();
    for (const [needle, key] of Object.entries(SUBJECT_NAME_TO_KEY)) {
      if (upper.includes(needle)) return key;
    }
    return null;
  }

  /**
   * Short, human display name for a course derived from its Canvas code string,
   * e.g. "THAOBTP6-TOÁN-10-THPT-OCEAN PARK-2026 - 2027" -> "TOÁN".
   *
   * Mirrors VinFocus's `courseSubjectKey`: the second dash-separated segment is the
   * subject. We only shorten when that segment is a RECOGNISED subject name, so
   * arbitrary course names are never mangled. Returns null when there's nothing
   * safe to shorten to.
   *
   * @param {string} name full course name/code
   * @returns {string|null}
   */
  function courseShortName(name) {
    const parts = String(name || "").split("-");
    if (parts.length < 2) return null;
    const token = parts[1].trim();
    return Object.prototype.hasOwnProperty.call(SUBJECT_NAME_TO_KEY, token) ? token : null;
  }

  CF.subjects = {
    SUBJECT_LABELS,
    SUBJECT_NAME_TO_KEY,
    getSubjectLabel,
    subjectKeyFromText,
    courseShortName,
  };
})();
