/**
 * CanvasFocus — Vietnamese strings.
 *
 * MAINTENANCE: keep keys identical to en.js. Missing keys fall back to the key
 * name, which makes gaps obvious during review.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;
  CF.i18n = CF.i18n || {};
  CF.i18n.translations = CF.i18n.translations || {};
  CF.i18n.translations.vi = {
    // Panel chrome
    panelTitle: "Học phần",
    open: "Mở CanvasFocus",
    close: "Đóng bảng",
    refresh: "Quét lại trang",
    diagnostics: "Chẩn đoán",
    diagnosticsOn: "Hiện bảng chẩn đoán",

    // Search / list
    searchPlaceholder: "Tìm học phần và mục…",
    groupOther: "Khác",
    weekLabel: "Tuần {n}",
    itemCount: "{n} mục",
    itemCountOne: "1 mục",

    // Empty states
    emptyNoItems: "Không tìm thấy mục nào trên trang này.",
    emptySearch: "Không có kết quả cho “{q}”.",
    emptyAllDone: "Không còn mục nào cần làm. 🎉",
    emptyNotModules: "Hãy mở trang Học phần của một khoá học để dùng CanvasFocus.",

    // Item types
    typeAssignment: "Bài tập",
    typeQuiz: "Trắc nghiệm",
    typeDiscussion: "Thảo luận",
    typePage: "Trang",
    typeExternalTool: "Công cụ ngoài",
    typeExternalUrl: "Liên kết",
    typeFile: "Tệp",
    typeSubheader: "Mục con",
    typeUnknown: "Mục",

    // Completion
    markDone: "Đã hoàn thành (Canvas)",
    markManual: "Bạn đã đánh dấu hoàn thành — nhấn để bỏ",
    markPending: "Chưa hoàn thành — Canvas đang theo dõi mục này",
    markUnknown: "Không theo dõi tiến độ — nhấn để tự đánh dấu đã xong",
    filterIncomplete: "Chỉ mục chưa xong",
    progressDone: "{n} đã xong",
    progressPending: "{n} chưa xong",
    progressUnknown: "{n} chưa rõ",

    // Diagnostics overlay
    debugHint: "Nếu một mục báo “MISS”, hãy sửa trong src/canvas/selectors.js.",
    debugCounts: "Đã quét",
    debugNone: "Chưa quét dữ liệu.",

    // Popup
    popupEnabled: "Bật trên Canvas",
    popupLanguage: "Ngôn ngữ",
    popupDiagnostics: "Bảng chẩn đoán",
    popupOpenCanvas: "Mở Canvas",
    popupHint: "Chọn ngôn ngữ Canvas và bật/tắt bảng hiển thị.",
    popupVersion: "Phiên bản {v}",
  };
})();
