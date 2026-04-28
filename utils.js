/**
 * Shared utility functions for BallotBuddy.
 * @module utils
 */

import { DAY_MS } from "./constants.js";

// HTML entity strings built with fromCharCode to avoid parsing issues
const AMP_ENTITY = String.fromCharCode(38, 97, 109, 112, 59);      // &amp;
const LT_ENTITY = String.fromCharCode(38, 108, 116, 59);            // <
const GT_ENTITY = String.fromCharCode(38, 103, 116, 59);            // >
const QUOT_ENTITY = String.fromCharCode(38, 113, 117, 111, 116, 59); // "
const APOS_ENTITY = String.fromCharCode(38, 35, 51, 57, 59);        // &#39;

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} value - Raw string to escape.
 * @returns {string} HTML-escaped string.
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", AMP_ENTITY)
    .replaceAll("<", LT_ENTITY)
    .replaceAll(">", GT_ENTITY)
    .replaceAll('"', QUOT_ENTITY)
    .replaceAll("'", APOS_ENTITY);
}

/**
 * Removes duplicate items from an array while preserving order.
 * @param {Array} items - Array of items.
 * @returns {Array} Deduplicated array.
 */
export function uniqueItems(items) {
  return [...new Set(items)];
}

/**
 * Formats a date for Google Calendar (UTC, yyyymmddThhmmssZ).
 * @param {Date} date - Date to format.
 * @returns {string} Formatted calendar date string.
 */
export function formatCalendarDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Formats a relative milestone date (e.g., "Oct 15").
 * @param {Date} electionDate - Election date.
 * @param {number} offsetDays - Days before election.
 * @returns {string} Formatted date string.
 */
export function formatRelativeMilestoneDate(electionDate, offsetDays) {
  const date = new Date(electionDate.getTime() - offsetDays * DAY_MS);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

/**
 * Creates a date object set to a specific hour.
 * @param {Date} date - Base date.
 * @param {number} hour - Hour to set (0-23).
 * @returns {Date} New date with specified hour.
 */
export function createDateAtHour(date, hour) {
  const nextDate = new Date(date);
  nextDate.setHours(hour, 0, 0, 0);
  return nextDate;
}

/**
 * Formats a voting method key into a human-readable label.
 * @param {string} method - Voting method key.
 * @returns {string} Human-readable label.
 */
export function formatVotingMethod(method) {
  if (method === "mail") {
    return "Mail / absentee";
  }
  if (method === "early") {
    return "Early voting";
  }
  return "In person";
}

/**
 * Debounces a function call.
 * @param {Function} fn - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Securely stores data in localStorage with validation.
 * @param {string} key - Storage key.
 * @param {Object} value - Value to store.
 */
export function secureSetItem(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 1024 * 1024) {
      console.warn("Storage item too large, skipping persistence.");
      return;
    }
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn("Failed to persist to localStorage:", error);
  }
}

/**
 * Securely retrieves and validates data from localStorage.
 * @param {string} key - Storage key.
 * @returns {Object|null} Parsed value or null.
 */
export function secureGetItem(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      delete parsed.__proto__;
      delete parsed.constructor;
      delete parsed.prototype;
    }
    return parsed;
  } catch (error) {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Creates a DocumentFragment from an HTML string.
 * @param {string} html - HTML string.
 * @returns {DocumentFragment} Created fragment.
 */
export function htmlToFragment(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Announces a message to screen readers via an ARIA live region.
 * @param {string} message - Message to announce.
 * @param {string} [priority="polite"] - Priority level.
 */
export function announceToScreenReader(message, priority = "polite") {
  const announcer = document.getElementById("sr-announcer");
  if (announcer) {
    announcer.setAttribute("aria-live", priority);
    announcer.textContent = message;
  }
}

