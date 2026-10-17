/**
 * CanvasFocus — panel styles as a template string.
 *
 * Lives in the Shadow DOM, so these rules are fully isolated from Canvas's own
 * CSS (and vice versa) — no reliance on Canvas class names, no specificity wars.
 * Because the content script runs in an isolated world, the page CSP does not
 * block this inline <style>. Keeping CSS in JS also means no
 * `web_accessible_resources` entry is needed for a stylesheet.
 *
 * Visual language echoes VinFocus (dark surface, blue accent) but is intentionally
 * self-contained — do NOT import VinFocus tokens; edit the values below.
 */
(function () {
  "use strict";

  const CF = globalThis.__canvasFocus;

  CF.panelCss = `
    :host { all: initial; }
    * { box-sizing: border-box; }

    .cf-root {
      --cf-bg: #121212;
      --cf-bg-card: #1a1a1a;
      --cf-bg-input: #242424;
      --cf-border: #2f2f2f;
      --cf-text: #eeeeee;
      --cf-muted: #9a9a9a;
      --cf-accent: #255fbf;
      --cf-accent-soft: rgba(37, 95, 191, 0.18);
      --cf-done: #8fd4a8;
      --cf-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
      --cf-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-family: var(--cf-sans);
      color: var(--cf-text);
    }

    /* Floating toggle button */
    .cf-fab {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 2147483000;
      width: 48px;
      height: 48px;
      border: 1px solid var(--cf-border);
      border-radius: 14px;
      background: var(--cf-bg-card);
      color: var(--cf-text);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      cursor: pointer;
      box-shadow: var(--cf-shadow);
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .cf-fab:hover { background: var(--cf-bg-input); transform: translateY(-1px); }
    .cf-fab:focus-visible { outline: 2px solid var(--cf-accent); outline-offset: 2px; }
    .cf-fab--hidden { display: none; }

    /* Sidebar */
    .cf-panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 2147483001;
      width: 380px;
      max-width: 92vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--cf-bg);
      border-left: 1px solid var(--cf-border);
      box-shadow: var(--cf-shadow);
      transform: translateX(100%);
      transition: transform 0.2s ease;
    }
    .cf-panel--open { transform: translateX(0); }

    .cf-head {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 14px 10px;
      border-bottom: 1px solid var(--cf-border);
    }
    .cf-head-text { flex: 1; min-width: 0; }
    .cf-title {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cf-subtitle { margin-top: 2px; font-size: 12px; color: var(--cf-muted); }
    .cf-icon-btn {
      flex: none;
      width: 28px;
      height: 28px;
      border: 1px solid var(--cf-border);
      border-radius: 8px;
      background: var(--cf-bg-card);
      color: var(--cf-text);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
    }
    .cf-icon-btn:hover { background: var(--cf-bg-input); }

    .cf-search-wrap { position: relative; padding: 10px 14px; }
    .cf-search {
      width: 100%;
      padding: 9px 11px;
      border: 1px solid var(--cf-border);
      border-radius: 10px;
      background: var(--cf-bg-input);
      color: var(--cf-text);
      font-size: 13px;
    }
    .cf-search::placeholder { color: var(--cf-muted); }
    .cf-search:focus { outline: none; border-color: var(--cf-accent); }

    .cf-body { flex: 1; overflow-y: auto; padding: 4px 8px 16px; }

    .cf-filters {
      display: flex;
      gap: 8px;
      padding: 0 14px 10px;
    }
    .cf-filter-toggle {
      border: 1px solid var(--cf-border);
      border-radius: 999px;
      background: var(--cf-bg-card);
      color: var(--cf-muted);
      font-size: 11px;
      padding: 4px 10px;
      cursor: pointer;
    }
    .cf-filter-toggle:hover { background: var(--cf-bg-input); color: var(--cf-text); }
    .cf-filter-toggle--on {
      background: var(--cf-accent-soft);
      border-color: var(--cf-accent);
      color: #c6ddff;
    }

    /* One row = the reveal button + the completion marker beside it, so the
       marker can be its own click target without nesting inside the button. */
    .cf-item-row { display: flex; align-items: center; gap: 2px; }
    .cf-item-row .cf-item { flex: 1; min-width: 0; }

    .cf-mark {
      flex: none;
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      font-size: 12px;
      line-height: 1;
    }
    .cf-mark[role="button"] { cursor: pointer; }
    .cf-mark[role="button"]:hover { background: var(--cf-bg-card); }
    /* Keep the manual mark's accent tint on hover (don't let the generic hover win). */
    .cf-mark--done-manual[role="button"]:hover { background: var(--cf-accent-soft); }
    .cf-mark[role="button"]:focus-visible { outline: 2px solid var(--cf-accent); outline-offset: 1px; }
    .cf-mark--done { color: var(--cf-done); font-weight: 700; }
    .cf-mark--done-manual {
      color: #c6ddff;
      font-weight: 700;
      background: var(--cf-accent-soft);
      border: 1px solid var(--cf-accent);
    }
    .cf-mark--pending { border: 1.5px solid var(--cf-muted); }
    .cf-mark--unknown {
      border: 1.5px dashed var(--cf-muted);
      color: var(--cf-muted);
      font-weight: 700;
    }

    .cf-group { margin: 10px 0 4px; }
    .cf-group-title {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 6px 8px;
      background: var(--cf-bg);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--cf-muted);
    }
    .cf-item {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 8px;
      border: 1px solid transparent;
      border-radius: 9px;
      background: none;
      color: inherit;
      text-align: left;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    .cf-item:hover { background: var(--cf-bg-card); border-color: var(--cf-border); }
    .cf-item-icon { flex: none; width: 20px; text-align: center; opacity: 0.85; }
    .cf-item-body { flex: 1; min-width: 0; }
    .cf-item-title {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cf-item-meta { font-size: 11px; color: var(--cf-muted); }
    .cf-badge {
      flex: none;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--cf-accent-soft);
      color: #c6ddff;
      font-size: 10px;
      font-weight: 600;
    }
    .cf-item--done .cf-item-title { color: var(--cf-muted); }
    .cf-item--subheader {
      padding: 10px 8px 2px;
      cursor: default;
      color: var(--cf-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .cf-item--subheader:hover { background: none; border-color: transparent; }

    .cf-empty { padding: 26px 16px; text-align: center; color: var(--cf-muted); font-size: 13px; }

    .cf-foot {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-top: 1px solid var(--cf-border);
      font-size: 11px;
      color: var(--cf-muted);
    }
    .cf-foot-spacer { flex: 1; }
    .cf-foot button {
      border: 1px solid var(--cf-border);
      border-radius: 8px;
      background: var(--cf-bg-card);
      color: var(--cf-muted);
      font-size: 11px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .cf-foot button:hover { background: var(--cf-bg-input); color: var(--cf-text); }

    /* Diagnostics overlay */
    .cf-debug {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 2147483002;
      max-width: 460px;
      max-height: 46vh;
      overflow: auto;
      padding: 10px 12px;
      background: #0a0a0a;
      border: 1px solid var(--cf-border);
      border-radius: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #d7d7d7;
      box-shadow: var(--cf-shadow);
    }
    .cf-debug--hidden { display: none; }
    .cf-debug h3 { margin: 0 0 6px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
    .cf-debug .cf-ok { color: #8fd4a8; }
    .cf-debug .cf-bad { color: #e8a0a0; }
    .cf-debug .cf-dim { color: #8a8a8a; }
    .cf-debug code { color: #c6ddff; }

    /* Outline pulse when the panel reveals a real Canvas row */
    .cf-reveal-flash {
      outline: 2px solid #255fbf !important;
      outline-offset: 2px;
      transition: outline-color 0.3s ease;
    }
  `;
})();
