# CanvasFocus

**A cleaner, searchable, week-grouped view of your Canvas course modules —
right on the Modules page.**

Canvas's own Modules page is a long, flat list. CanvasFocus adds a tidy sidebar
that groups everything by **week**, lets you **search**, and shows **what you've
done** at a glance.

It reads the page Canvas has **already rendered**. There is **no Canvas API, no
token, no OAuth, no developer key, and no backend** — nothing leaves your browser.

> Built and verified against a live **Vinschool** Canvas course, but it targets
> Canvas's standard Modules markup, so it works on other Canvas instances too
> (see [Point it at your Canvas](#point-it-at-your-canvas)).

---

## What it does

- 🔎 **Search** every module item (and module name) as you type.
- 🗓️ **Groups by week**, parsed from module titles (`Tuần 1-3`, `Week 5 & 7`, …).
- ⏱️ **Shows progress** per item and for the whole course, so you can see what's
  left without scrolling and re-reading.
- ✅ **Remembers what you mark done**, per course.
- 🧭 **Jumps to the real item** on the page when you click it.
- 🌐 **English / Tiếng Việt**, switchable and remembered.
- 🔒 **Private by design** — no network requests at all.

---

## Install

Works in **Chrome, Edge, and other Chromium browsers**, plus **Firefox**.

### Chrome / Edge
1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and pick this folder (the one with `manifest.json`).
4. Open a Canvas course → **Modules**. A floating **CF** button appears
   bottom-right.

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json`.
3. Same as above.

> ⚠️ **Firefox temporary add-ons disappear when Firefox restarts.** For a
> permanent install, sign it **unlisted** — free and not listed in AMO search:
> `web-ext sign --channel unlisted`.

### Point it at your Canvas

Out of the box the extension only activates on **`lms.vinschool.edu.vn`**. To use
it on a different Canvas site, open `manifest.json` and replace that domain (in
**both** `content_scripts[].matches` and `host_permissions`), then reload the
extension:

```jsonc
"content_scripts": [{ "matches": ["https://YOUR-CANVAS.example.edu/*"], ... }],
"host_permissions": ["https://YOUR-CANVAS.example.edu/*"]
```

---

## Using it

- **Search** filters items live (matches item title and module name).
- Items are **grouped by week**. Modules with no week info land in **Other**.
- **Click an item** to scroll to and expand the real Canvas row.
- The **header** shows a short course name — Canvas codes like
  `THAOBTP6-TOÁN-10-THPT-OCEAN PARK-2026 - 2027` become the recognized subject
  (**TOÁN**); hover it for the full name. Underneath, a progress breakdown like
  `2 done · 95 pending · 7 untracked`.

### The four completion markers

Canvas doesn't always expose whether an item is done, so CanvasFocus shows you
*exactly what it knows* — and lets you fill the gaps.

| Marker | Meaning | Click it to… |
| --- | --- | --- |
| **✓** (green) | **Done** — Canvas confirms it. | *(nothing — read-only)* |
| **○** (open circle) | **Pending** — Canvas tracks a requirement here that isn't met yet. | mark it done yourself |
| **?** (dashed circle) | **Untracked** — Canvas isn't tracking this item at all, so no one can know. | mark it done yourself |
| **✓** (blue) | **Marked done by you.** | undo your mark |

- Your **manual marks are yours alone** and are stored **per course** in your
  browser. They're never presented as if Canvas said so.
- **Only not-done** hides finished items so you can focus on what's left
  (manual marks count as done). Your choice is remembered.
- The **CF popup** (toolbar icon) toggles the extension on/off, switches
  **English / Tiếng Việt**, and turns the diagnostics overlay on/off.
- Press **Esc** to close the panel.

> **Why do finished quizzes sometimes show as ○ or ?** Because the teacher didn't
> enable completion tracking for them, or Canvas provably exposes no state.
> Rather than guess, CanvasFocus leaves them unfinished — click the marker to mark
> them done yourself. (This is expected, not a bug.)

---

## Troubleshooting

**The CF button doesn't appear.**
- You must be on a **Modules page** — the URL contains `/courses/<id>/modules`.
  CanvasFocus only mounts there.
- Check the popup's **Enable on Canvas** toggle is on.
- On a non-Vinschool Canvas? See [Point it at your Canvas](#point-it-at-your-canvas).

**The panel says "No module items found".**
- Canvas may still be rendering — click **Re-scan**.
- If it persists, add `?debug` to the URL and open **Diagnostics** (see
  [When Canvas changes](#when-canvas-changes)).

**A finished item shows as ○ or ?.** Expected — see the note above; click the
marker to mark it done.

**Firefox forgot the extension.** Temporary add-ons reset on restart. Sign it
unlisted for a permanent install (see above).

**Something broke after a Canvas update.** Almost always a one-file fix — see
[When Canvas changes](#when-canvas-changes).

---

## Privacy & safety

- Reads the DOM Canvas has **already rendered**. No Canvas API, token, OAuth,
  developer key, background worker, or server.
- Makes **zero network requests** — nothing about you is sent anywhere. (You can
  confirm in DevTools → Network.)
- Your settings and manual done-marks live in your browser's local extension
  storage, and nowhere else.
- It's small and open source — [read the code](src/).

---

## For developers

**No build step, by design.** Everything is plain JS, loaded as content scripts.

### Project layout

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
    item-state.js          done/pending/unknown resolution (pure, DOM-free)
    panel.css.js           panel styles as a string (injected into the ShadowRoot)
    panel.js               the Shadow-DOM sidebar UI
    bootstrap.js           entry: settings -> mount + observe
  popup/                   toolbar popup (on/off, language, diagnostics)
icons/                     generated PNGs
scripts/                   check.js, make-icons.py
tests/                     node:test suites for the pure logic (no deps)
```

### Architecture (why it's shaped this way)

MV3 content scripts can't use static ES `import`, so files are listed in
**dependency order** in `manifest.json` and share a single global namespace,
`globalThis.__canvasFocus` (aliased `CF`). Adding a file means adding it to that
list **in the right position** — the list is effectively a poor-man's module
loader.

**The one seam that keeps B2 cheap.** The UI only ever talks to the **provider
contract** (`providers/index.js`):

```js
getCourses()                  // [{ id, name, shortName?, subjectKey? }]
getModules(courseId)          // [{ id, title, weeks }]
getItems(courseId, moduleId)  // [{ id, title, type, url, completed, tracked, element? }]
getCompletion(courseId)       // { [itemId]: boolean }
```

`completed` = Canvas confirms the item is done; `tracked` = Canvas defines a
requirement for it. The panel maps these to **done / pending / unknown** (see
`src/content/item-state.js`), so a provider that knows completion for every item
should set `tracked: true` to avoid showing "unknown".

B1 implements it by reading the DOM (`providers/dom.js`). B2 will implement the
same four methods with same-origin `fetch` + the user's session cookie
(`providers/session.js`) and flip `PROVIDER_KIND` in `providers/index.js` — the
panel, i18n, weeks, and selectors stay untouched. `element` (a live DOM node used
to reveal a row) is a B1 affordance; the panel already falls back to opening
`item.url` when it's absent, so B2 works as-is.

**Isolation.** The panel lives in a **ShadowRoot**, so Canvas CSS can't reach in
and ours can't reach out. Panel CSS is a JS string, so no
`web_accessible_resources` entry is needed (content scripts run in an isolated
world, so the page CSP doesn't block it). The only page-level style is
`.cf-reveal-flash`, injected into `<head>` purely to highlight a real Canvas row
after the panel scrolls to it. A `MutationObserver` + patched
`history.pushState/replaceState` + `popstate` cover Canvas's SPA navigation (any
one alone is not enough).

### When Canvas changes

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
   or `MISS` with the ones it tried. A few lines carry extra context rather than
   selector results: `scan` (module/item counts + resolved course name +
   confirmed-completion count), `courseNameCandidates` (every string considered
   for the header), `itemRowClasses` (classes that appear on *some* rows but not
   all, with counts — how you'd spot a completion marker we don't use yet),
   `itemParentClasses` (class sets of the rows' parents — catches a marker on a
   wrapping element), and `modulesWithoutItems` (a module that parsed to zero
   items — usually one Canvas hadn't finished rendering; the panel re-scans).
   Note: Canvas bakes a per-object id into each row's class (`Quiz_2253163`),
   which the `itemRowClasses` line strips before comparing.
3. Inspect the live page (right-click → Inspect) and **add a new selector to the
   front of the relevant list** in `selectors.js`. Don't delete the old ones
   unless you're sure they're gone — keeping them costs nothing.
4. Never match on visible text: Canvas here is bilingual (EN/VI).

Nothing else should need editing when Canvas updates. If you find yourself
editing `providers/dom.js` for a markup change, that knowledge probably belongs
in `selectors.js` instead.

### Verify

```
npm test          # pure-logic tests: week parsing, subject mapping, i18n parity, states
npm run check     # node --check on every .js + manifest references resolve
```

`npm test` needs **no dependencies** (Node's built-in test runner) and covers the
logic that does **not** need a browser. Anything DOM-related is verified manually
against a live Canvas page, since that is the only environment where it's real.

Then load unpacked (Chrome) / temporary add-on (Firefox) and confirm, on a real
Modules page:

1. The **CF** button appears; the panel lists the same modules/items as the page.
2. Search filters live; clicking an item scrolls/expands it.
3. Click a **?** / **○** marker → it becomes a blue ✓, and survives a page reload.
4. **Only not-done** hides finished items.
5. Navigate **course → course → back** (SPA): the panel re-renders.
6. `?debug` shows **OK** for each field (MISS only for genuinely absent data,
   e.g. a subheader with no link).
7. Toggle EN/VI; the choice persists across reloads.
8. DevTools → Network shows **zero requests from the extension** (B1 must make none).

### Package

```
npm run zip       # runs the check, then writes canvasfocus.zip
npm run icons     # regenerate icons/icon{16,32,48,128}.png (needs Pillow)
```

`canvasfocus.zip` can be uploaded to the Chrome Web Store / AMO, or sent to
someone to unpack manually.

### Deliberately out of scope (B1)

- No Canvas REST API, no PAT entry, no OAuth.
- No cross-course / "all my courses" dashboard (that's B2).
- No background service worker.
- No analytics/feedback (no backend exists).
- No bundler / TypeScript.

### Provenance

The week parser and subject tables are ports of logic from the author's
**VinFocus** project (`main.py`, `static/js/app.js`). If a parsing bug is fixed
there, mirror it in `src/canvas/weeks.js` / `subjects.js`. This extension is a
**separate project** — never commit extension code into the VinFocus repo.

---

## Questions, bugs, contributing

Open an issue or PR at
**[github.com/plmhyuuri/CanvasFocus](https://github.com/plmhyuuri/CanvasFocus/issues)**.
For Canvas-markup problems, include the `?debug` diagnostics output — it usually
points straight at the selector to fix.
