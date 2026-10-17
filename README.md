# CanvasFocus

A Chrome + Firefox extension that adds a **cleaner, searchable, week-grouped view
of a course's Canvas modules** — injected directly into Canvas's own Modules page.

It reads the page Canvas has **already rendered**. There is **no Canvas API, no
token, no OAuth, no developer key, and no backend**. Nothing about you is sent
anywhere.

> This is the **B1** milestone (pure DOM reading). A future **B2** can add
> cross-course views via same-origin session fetches — see
> [`src/providers/session.js`](src/providers/session.js).

---

## Install (sideload)

### Chrome / Edge
1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. **Load unpacked** → select this folder (the one containing `manifest.json`).
4. Open a Canvas course → **Modules**.

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on…** → pick `manifest.json`.
3. Same as above.

> Firefox temporary add-ons reset when the browser restarts. For a permanent,
> non-public install, sign it **unlisted**: `web-ext sign --channel unlisted`
> (free, not listed in AMO search).

A floating **CF** button appears bottom-right on any Modules page. Click it to
open the panel, search, and jump to items.

---

## Using it

- **Search** filters module items live (matches item title and module name).
- Items are **grouped by week**, parsed from module titles (`Tuần 1-3`, `Week 5 & 7`,
  …). Modules with no week info land in **Other**.
- Click an item to **scroll to and expand** the real Canvas module row.
- A **✓** appears only when completion is *confirmed*. Canvas does not always
  expose completion state — a teacher may not enable tracking, and Canvas's
  `<span class="completion_requirement">` is a requirement *description*, not
  state. So CanvasFocus never guesses: no marker means no ✓ (never a "not
  completed" claim). See `readCompleted()` in `src/providers/dom.js`.
- The **Diagnostics** button (or `?debug` in the URL) shows which DOM selectors
  matched — your first stop when Canvas changes.
- The **CF** popup toggles the extension on/off, switches EN/VI, and toggles
  diagnostics.

---

## When Canvas changes (the only maintenance you should need)

Canvas's HTML is not a stable contract. Almost all of it is isolated to **one
file**:

```
src/canvas/selectors.js
```

That file is an **ordered fallback registry**: every field (`moduleContainer`,
`moduleTitle`, `itemRow`, …) is a list of candidate selectors, tried in order.
When something breaks:

1. Open a Modules page with `?debug` in the URL (e.g. `…/modules?debug`).
2. Read the diagnostics overlay: it prints, per field, the selector that matched
   or `MISS` with the ones it tried.
3. Inspect the live page (right-click → Inspect) and **add a new selector to the
   front of the relevant list** in `selectors.js`. Do not delete the old ones
   unless you're sure they're gone — keeping them costs nothing.
4. Never match on visible text: Canvas here is bilingual (EN/VI).

Nothing else should need editing when Canvas updates. If you find yourself
editing `providers/dom.js` for a markup change, that knowledge probably belongs
in `selectors.js` instead.

---

## Verify

```
npm test          # pure-logic tests: week parsing, subject mapping, i18n key parity
npm run check     # node --check on every .js + manifest references resolve
```

`npm test` needs no dependencies (Node's built-in test runner) and covers the
logic that does **not** need a browser. Anything DOM-related is verified manually
against a live Canvas page, since that is the only environment where it's real.

Then load unpacked (Chrome) / temporary add-on (Firefox) and confirm, on a real
Modules page:

1. The **CF** button appears; the panel lists the same modules/items as the page.
2. Search filters live; clicking an item scrolls/expands it.
3. Navigate **course → course → back** (SPA): the panel re-renders.
4. `?debug` shows **OK** for each field (MISS only for genuinely absent data,
   e.g. a subheader with no link).
5. Toggle EN/VI; the choice persists across reloads.
6. DevTools → Network shows **zero requests from the extension** (B1 must make none).

---

## Package

```
npm run zip       # runs the check, then writes canvasfocus.zip
npm run icons     # regenerate icons/icon{16,32,48,128}.png (needs Pillow)
```

`canvasfocus.zip` can be uploaded to the Chrome Web Store / AMO, or sent to
someone to unpack manually.

---

## Architecture (why it's shaped this way)

**No build step, by design.** MV3 content scripts can't use static ES `import`,
so files are listed in **dependency order** in `manifest.json` and share a single
global namespace, `globalThis.__canvasFocus` (aliased `CF`). Adding a file means
adding it to that list **in the right position** — that list is effectively a
poor-man's module loader.

```
manifest.json              ← entry point; content_scripts.js IS the load order
src/
  util/browser.js          namespace, storage wrapper, cross-browser API, logging
  canvas/
    selectors.js           ← EDIT THIS when Canvas changes (fallback registry)
    weeks.js               week-number parsing (ported from VinFocus)
    subjects.js            subject keys + EN/VI labels (ported from VinFocus)
  i18n/
    en.js vi.js index.js   EN/VI strings + t(); language persisted in storage
  providers/
    index.js               the data contract + provider selection
    dom.js                 B1: reads the rendered DOM
    session.js             B2: same-origin fetch (NOT loaded yet)
  content/
    route.js               SPA pushState + MutationObserver -> route/content events
    panel.css.js           panel styles as a string (injected into the ShadowRoot)
    panel.js               the Shadow-DOM sidebar UI
    bootstrap.js           entry: settings -> mount + observe
  popup/                   toolbar popup (on/off, language, diagnostics)
icons/                     generated PNGs
scripts/                   check.js, make-icons.py
tests/                     node:test suites for the pure logic (no deps)
```

### The one seam that keeps B2 cheap

The UI only ever talks to the **provider contract** (`providers/index.js`):

```js
getCourses()                  // [{ id, name, subjectKey? }]
getModules(courseId)          // [{ id, title, weeks }]
getItems(courseId, moduleId)  // [{ id, title, type, url, completed, element? }]
getCompletion(courseId)       // { [itemId]: boolean }
```

B1 implements it by reading the DOM (`providers/dom.js`). B2 will implement the
same four methods with same-origin `fetch` + the user's session cookie
(`providers/session.js`) and flip `PROVIDER_KIND` in `providers/index.js` — the
panel, i18n, weeks, and selectors stay untouched.

`element` (a live DOM node, used to reveal a row) is a B1 affordance; the panel
already falls back to opening `item.url` when it's absent, so B2 works as-is.

### Isolation

- The panel lives in a **ShadowRoot**, so Canvas CSS can't reach in and ours can't
  reach out. Panel CSS is a JS string, so no `web_accessible_resources` entry is
  needed. (Content scripts run in an isolated world, so the page CSP doesn't block it.)
- The only page-level style is `.cf-reveal-flash`, injected into `<head>` purely to
  highlight a real Canvas row after the panel scrolls to it.
- A `MutationObserver` + patched `history.pushState/replaceState` + `popstate`
  cover Canvas's SPA navigation (any one alone is not enough).

---

## Deliberately out of scope (B1)

- No Canvas REST API, no PAT entry, no OAuth.
- No cross-course / "all my courses" dashboard (that's B2).
- No background service worker.
- No analytics/feedback (no backend exists).
- No bundler / TypeScript.

## Provenance

The week parser and subject tables are ports of logic from the author's
**VinFocus** project (`main.py`, `static/js/app.js`). If a parsing bug is fixed
there, mirror it in `src/canvas/weeks.js` / `subjects.js`. This extension is a
**separate project** — never commit extension code into the VinFocus repo.
