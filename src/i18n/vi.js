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
    completed: "Đã hoàn thành",
    notCompleted: "Chưa hoàn thành",

    // Diagnostics overlay
    debugHint: "Nếu một mục báo “không khớp”, hãy sửa trong src/canvas/selectors.js.",
    debugFields: "Kết quả selector",
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
