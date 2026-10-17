/**
 * Item-state tests — the four-state completion model, with no DOM.
 *
 * This is the logic behind the panel's ✓ / ○ / ? markers and the "only not-done"
 * filter, so it's worth pinning precisely:
 *   done         Canvas confirms completion
 *   done-manual  the user marked it done (Canvas shows nothing)
 *   pending      Canvas tracks a requirement that is NOT met
 *   unknown      Canvas exposes no tracking signal at all
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resetNamespace, load } = require("./_harness");

const CF = resetNamespace();
load("content/item-state.js");
const { resolve, isDone, storageKey } = CF.itemState;

test("Canvas-confirmed completion wins over everything", () => {
  assert.equal(resolve({ id: "a", completed: true, tracked: true }, {}), "done");
  assert.equal(resolve({ id: "a", completed: true, tracked: false }, { a: true }), "done");
});

test("a manual override turns an unfinished item into done-manual", () => {
  assert.equal(resolve({ id: "a", completed: false, tracked: true }, { a: true }), "done-manual");
  assert.equal(resolve({ id: "a", completed: false, tracked: false }, { a: true }), "done-manual");
});

test("tracked-but-not-completed is pending; untracked is unknown", () => {
  assert.equal(resolve({ id: "a", completed: false, tracked: true }, {}), "pending");
  assert.equal(resolve({ id: "a", completed: false, tracked: false }, {}), "unknown");
});

test("isDone() is true for both done states and nothing else", () => {
  assert.equal(isDone("done"), true);
  assert.equal(isDone("done-manual"), true);
  assert.equal(isDone("pending"), false);
  assert.equal(isDone("unknown"), false);
});

test("a manual override for a DIFFERENT item does not leak", () => {
  assert.equal(resolve({ id: "b", completed: false, tracked: true }, { a: true }), "pending");
});

test("missing/empty item resolves to unknown rather than throwing", () => {
  assert.equal(resolve(null), "unknown");
  assert.equal(resolve(undefined), "unknown");
});

test("storageKey namespaces manual overrides per course", () => {
  assert.equal(storageKey("9"), "manualDone:9");
  assert.notEqual(storageKey("9"), storageKey("10"));
});
