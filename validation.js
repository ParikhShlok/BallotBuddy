/**
 * Input validation and sanitization layer for BallotBuddy.
 * Prevents XSS, prototype pollution, and injection attacks.
 * @module validation
 */

import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_DAYS_UNTIL_ELECTION,
  DEFAULT_DAYS_UNTIL_ELECTION,
  VOTING_METHODS,
  REGISTRATION_STATUSES,
  ACCESSIBILITY_NEEDS,
  AGE_GROUPS,
  MAIN_CONCERNS
} from "./constants.js";

/** Pattern to detect potential script injection. */
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/** Pattern to detect event handler injection. */
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=/gi;

/** Pattern to detect prototype pollution keys. */
const PROTO_POLLUTION_PATTERN = /^(?:__proto__|constructor|prototype)$/;

/** Pattern to detect URL-based attacks. */
const URL_ATTACK_PATTERN = /javascript:|data:text\/html|vbscript:/gi;

/**
 * Sanitizes a string by removing dangerous HTML and script content.
 * @param {string} value - Raw input string.
 * @param {number} maxLength - Maximum allowed length.
 * @returns {string} Sanitized string.
 */
export function sanitizeString(value, maxLength = 200) {
  if (typeof value !== "string") {
    return "";
  }

  let trimmed = value.trim();
  if (trimmed.length > maxLength) {
    trimmed = trimmed.slice(0, maxLength);
  }

  // Remove script tags
  trimmed = trimmed.replace(SCRIPT_PATTERN, "");
  // Remove event handlers
  trimmed = trimmed.replace(EVENT_HANDLER_PATTERN, "");
  // Prevent URL-based attacks
  trimmed = trimmed.replace(URL_ATTACK_PATTERN, "[removed]");

  return trimmed;
}

/**
 * Validates and normalizes the days until election input.
 * @param {string|number} value - Raw input value.
 * @returns {number} Normalized number of days.
 */
export function validateDaysUntilElection(value) {
  // Explicitly check for null, undefined, or empty string
  if (value === null || value === undefined || value === "") {
    return DEFAULT_DAYS_UNTIL_ELECTION;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DAYS_UNTIL_ELECTION;
  }
  return Math.min(parsed, MAX_DAYS_UNTIL_ELECTION);
}

/**
 * Validates if a value is one of the allowed enum values.
 * @param {string} value - Input value to validate.
 * @param {Object} enumObj - Object containing allowed values.
 * @param {string} defaultValue - Fallback value if invalid.
 * @returns {string} Validated value.
 */
export function validateEnum(value, enumObj, defaultValue) {
  const cleanValue = sanitizeString(value, 40);
  const allowedValues = Object.values(enumObj);
  return allowedValues.includes(cleanValue) ? cleanValue : defaultValue;
}

/**
 * Validates and sanitizes form data completely.
 * @param {Object} rawData - Raw form data object.
 * @returns {Object} Sanitized and validated form data.
 */
export function validateFormData(rawData) {
  if (!rawData || typeof rawData !== "object") {
    return {};
  }

  // Prevent prototype pollution by only copying safe keys
  const data = {};

  for (const key of Object.keys(rawData)) {
    // Skip prototype pollution keys
    if (PROTO_POLLUTION_PATTERN.test(key)) {
      continue;
    }

    data[key] = rawData[key];
  }

  return {
    name: sanitizeString(data.name, MAX_NAME_LENGTH),
    address: sanitizeString(data.address, MAX_ADDRESS_LENGTH),
    daysUntilElection: validateDaysUntilElection(data.daysUntilElection),
    registrationStatus: validateEnum(
      data.registrationStatus,
      REGISTRATION_STATUSES,
      REGISTRATION_STATUSES.UNKNOWN
    ),
    movedRecently: validateEnum(
      data.movedRecently,
      { YES: "yes", NO: "no" },
      "no"
    ),
    votingMethod: validateEnum(
      data.votingMethod,
      VOTING_METHODS,
      VOTING_METHODS.IN_PERSON
    ),
    accessibilityNeed: validateEnum(
      data.accessibilityNeed,
      ACCESSIBILITY_NEEDS,
      ACCESSIBILITY_NEEDS.NONE
    ),
    ageGroup: validateEnum(
      data.ageGroup,
      AGE_GROUPS,
      AGE_GROUPS.ADULT
    ),
    mainConcern: validateEnum(
      data.mainConcern,
      MAIN_CONCERNS,
      MAIN_CONCERNS.CONFIDENCE
    ),
    wantsReminders: data.wantsReminders === "on" ? "on" : "off",
    showGoogleServices: data.showGoogleServices === "on" ? "on" : "off"
  };
}

/**
 * Validates a question string for the Q&A feature.
 * @param {string} question - Raw question input.
 * @returns {string} Sanitized question.
 */
export function validateQuestion(question) {
  return sanitizeString(question, 300);
}

/**
 * Checks if a string contains suspicious content.
 * @param {string} value - Value to check.
 * @returns {boolean} True if suspicious content detected.
 */
export function containsSuspiciousContent(value) {
  if (typeof value !== "string") {
    return false;
  }
  return SCRIPT_PATTERN.test(value) ||
    EVENT_HANDLER_PATTERN.test(value) ||
    URL_ATTACK_PATTERN.test(value);
}
