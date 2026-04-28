import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeString,
  validateDaysUntilElection,
  validateEnum,
  validateFormData,
  validateQuestion,
  containsSuspiciousContent
} from "../validation.js";

import {
  REGISTRATION_STATUSES,
  VOTING_METHODS,
  ACCESSIBILITY_NEEDS,
  AGE_GROUPS,
  MAIN_CONCERNS,
  DEFAULT_DAYS_UNTIL_ELECTION,
  MAX_DAYS_UNTIL_ELECTION,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH
} from "../constants.js";

test("sanitizeString removes script tags", () => {
  const input = "Hello <script>alert('xss')</script> world";
  const result = sanitizeString(input);
  assert.ok(!result.includes("<script>"));
  assert.ok(!result.includes("alert"));
});

test("sanitizeString removes event handlers", () => {
  const input = "<img onerror=alert(1) src=x>";
  const result = sanitizeString(input);
  assert.ok(!result.includes("onerror"));
});

test("sanitizeString removes javascript URLs", () => {
  const input = "javascript:alert(1)";
  const result = sanitizeString(input);
  assert.ok(!result.includes("javascript:"));
});

test("sanitizeString enforces max length", () => {
  const input = "a".repeat(500);
  const result = sanitizeString(input, 100);
  assert.equal(result.length, 100);
});

test("sanitizeString handles non-string input", () => {
  assert.equal(sanitizeString(null), "");
  assert.equal(sanitizeString(undefined), "");
  assert.equal(sanitizeString(123), "");
});

test("validateDaysUntilElection rejects negative values", () => {
  assert.equal(validateDaysUntilElection(-5), DEFAULT_DAYS_UNTIL_ELECTION);
});

test("validateDaysUntilElection caps at maximum", () => {
  assert.equal(validateDaysUntilElection(999), MAX_DAYS_UNTIL_ELECTION);
});

test("validateDaysUntilElection accepts valid values", () => {
  assert.equal(validateDaysUntilElection(30), 30);
  assert.equal(validateDaysUntilElection(0), 0);
});

test("validateDaysUntilElection handles non-numeric input", () => {
  assert.equal(validateDaysUntilElection("abc"), DEFAULT_DAYS_UNTIL_ELECTION);
  assert.equal(validateDaysUntilElection(null), DEFAULT_DAYS_UNTIL_ELECTION);
});

test("validateEnum returns default for invalid values", () => {
  const result = validateEnum("invalid", VOTING_METHODS, VOTING_METHODS.IN_PERSON);
  assert.equal(result, VOTING_METHODS.IN_PERSON);
});

test("validateEnum accepts valid values", () => {
  const result = validateEnum("mail", VOTING_METHODS, VOTING_METHODS.IN_PERSON);
  assert.equal(result, VOTING_METHODS.MAIL);
});

test("validateFormData prevents prototype pollution", () => {
  const malicious = {
    name: "Alice",
    __proto__: { isAdmin: true },
    constructor: { prototype: { isAdmin: true } }
  };
  const result = validateFormData(malicious);
  assert.equal(result.name, "Alice");
  assert.ok(!Object.prototype.hasOwnProperty.call(result, "__proto__"));
  assert.ok(!Object.prototype.hasOwnProperty.call(result, "constructor"));
});

test("validateFormData sanitizes all string inputs", () => {
  const input = {
    name: "<script>alert(1)</script>Bob",
    address: "javascript:alert(1)",
    daysUntilElection: 15,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  };
  const result = validateFormData(input);
  assert.ok(!result.name.includes("<script>"));
  assert.ok(!result.address.includes("javascript:"));
});

test("validateFormData enforces name length limit", () => {
  const input = {
    name: "a".repeat(MAX_NAME_LENGTH + 50),
    daysUntilElection: 15
  };
  const result = validateFormData(input);
  assert.equal(result.name.length, MAX_NAME_LENGTH);
});

test("validateFormData enforces address length limit", () => {
  const input = {
    address: "a".repeat(MAX_ADDRESS_LENGTH + 50),
    daysUntilElection: 15
  };
  const result = validateFormData(input);
  assert.equal(result.address.length, MAX_ADDRESS_LENGTH);
});

test("validateQuestion sanitizes input", () => {
  const input = "What is <script>alert(1)</script> voting?";
  const result = validateQuestion(input);
  assert.ok(!result.includes("<script>"));
});

test("validateQuestion enforces max length", () => {
  const input = "a".repeat(400);
  const result = validateQuestion(input);
  assert.equal(result.length, 300);
});

test("containsSuspiciousContent detects scripts", () => {
  assert.ok(containsSuspiciousContent("<script>alert(1)</script>"));
  assert.ok(!containsSuspiciousContent("Hello world"));
});

test("containsSuspiciousContent detects event handlers", () => {
  assert.ok(containsSuspiciousContent("<img onerror=alert(1)>"));
});

test("containsSuspiciousContent detects javascript URLs", () => {
  assert.ok(containsSuspiciousContent("javascript:void(0)"));
});
