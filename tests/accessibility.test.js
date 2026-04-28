import test from "node:test";
import assert from "node:assert/strict";

import { escapeHtml } from "../utils.js";

// Build expected strings safely to avoid parsing issues
const AMP_ENTITY = String.fromCharCode(38, 97, 109, 112, 59);
const LT_ENTITY = String.fromCharCode(38, 108, 116, 59);
const GT_ENTITY = String.fromCharCode(38, 103, 116, 59);
const QUOT_ENTITY = String.fromCharCode(38, 113, 117, 111, 116, 59);
const APOS_ENTITY = String.fromCharCode(38, 35, 51, 57, 59);

test("escapeHtml escapes ampersands", () => {
  assert.equal(escapeHtml("Tom & Jerry"), "Tom " + AMP_ENTITY + " Jerry");
});

test("escapeHtml escapes less-than signs", () => {
  assert.equal(escapeHtml("<div>"), LT_ENTITY + "div" + GT_ENTITY);
});

test("escapeHtml escapes greater-than signs", () => {
  assert.equal(escapeHtml(">"), GT_ENTITY);
});

test("escapeHtml escapes double quotes", () => {
  assert.equal(escapeHtml('"hello"'), QUOT_ENTITY + "hello" + QUOT_ENTITY);
});

test("escapeHtml escapes single quotes", () => {
  assert.equal(escapeHtml("it's"), "it" + APOS_ENTITY + "s");
});

test("escapeHtml handles empty strings", () => {
  assert.equal(escapeHtml(""), "");
});

test("escapeHtml handles numbers", () => {
  assert.equal(escapeHtml(123), "123");
});

test("escapeHtml prevents XSS payload", () => {
  const payload = "<script>alert('xss')</script>";
  const result = escapeHtml(payload);
  assert.ok(!result.includes("<script>"));
  assert.ok(result.includes(LT_ENTITY + "script" + GT_ENTITY));
});

