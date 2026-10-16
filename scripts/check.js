#!/usr/bin/env node
/**
 * CanvasFocus — static check for the no-build source.
 *
 * Runs `node --check` on every .js file under src/ (plus manifest.json validity).
 * This is the same sanity gate VinFocus uses, and it catches syntax errors that
 * would otherwise only show up as a silent content-script failure in the browser.
 *
 * Usage:  npm run check   (or: node scripts/check.js)
 */
"use strict";

const { execFileSync } = require("node:child_process");
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, extname } = require("node:path");

const ROOT = join(__dirname, "..");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function checkJs() {
  const files = walk(join(ROOT, "src")).filter((f) => extname(f) === ".js");
  let failures = 0;
  for (const file of files) {
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
      console.log(`ok    ${file.replace(`${ROOT}/`, "")}`);
    } catch (err) {
      failures += 1;
      console.error(`FAIL  ${file.replace(`${ROOT}/`, "")}`);
      console.error(String(err.stderr || err.message).trim());
    }
  }
  return failures;
}

function checkManifest() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
    console.log("ok    manifest.json (valid JSON)");
  } catch (err) {
    console.error("FAIL  manifest.json");
    console.error(err.message);
    return 1;
  }

  // Every path the manifest points at must exist, or the extension silently
  // fails to load that piece in the browser.
  const refs = new Set();
  for (const cs of manifest.content_scripts || []) {
    for (const js of cs.js || []) refs.add(js);
  }
  if (manifest.action && manifest.action.default_popup) refs.add(manifest.action.default_popup);
  const iconGroups = [manifest.icons, manifest.action && manifest.action.default_icon];
  for (const group of iconGroups) {
    if (group) for (const p of Object.values(group)) refs.add(p);
  }

  let failures = 0;
  for (const ref of refs) {
    if (!statSafe(join(ROOT, ref))) {
      console.error(`FAIL  manifest references missing file: ${ref}`);
      failures += 1;
    }
  }
  if (!failures) console.log(`ok    manifest.json (${refs.size} referenced files present)`);
  return failures;
}

function statSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

const failures = checkJs() + checkManifest();
if (failures) {
  console.error(`\n${failures} file(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
