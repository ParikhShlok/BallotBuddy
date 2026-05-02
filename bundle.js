(function () {
"use strict";


/* constants.js */
/**
 * Application constants to eliminate magic numbers and centralize configuration.
 * @module constants
 */

/** Number of milliseconds in one day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Maximum allowed days until election. */
const MAX_DAYS_UNTIL_ELECTION = 365;

/** Default days until election fallback. */
const DEFAULT_DAYS_UNTIL_ELECTION = 21;

/** Maximum input string length for name field. */
const MAX_NAME_LENGTH = 40;

/** Maximum input string length for address field. */
const MAX_ADDRESS_LENGTH = 120;

/** Score thresholds for readiness bands. */
const READINESS_THRESHOLDS = {
  STRONG: 80,
  NEEDS_ATTENTION: 60,
  MINIMUM: 18
};

/** Score penalties for various risk factors. */
const READINESS_PENALTIES = {
  NOT_REGISTERED: 32,
  UNKNOWN_REGISTRATION: 20,
  MOVED_RECENTLY: 14,
  MAIL_VOTING_LATE: 18,
  MAIL_VOTING_EARLY: 10,
  ACCESSIBILITY_LATE: 14,
  ACCESSIBILITY_EARLY: 8,
  MISSING_ADDRESS: 8,
  ELECTION_VERY_CLOSE: 18,
  ELECTION_CLOSE: 12,
  ELECTION_MODERATE: 6
};

/** Day thresholds for urgency classification. */
const URGENCY_THRESHOLDS = {
  VERY_CLOSE: 7,
  CLOSE: 14,
  MODERATE: 30
};

/** Maximum milestones to display. */
const MAX_MILESTONES = 4;

/** Maximum calendar links to generate. */
const MAX_CALENDAR_LINKS = 3;

/** Maximum quick links to display. */
const MAX_QUICK_LINKS = 4;

/** Maximum top actions in generated card. */
const MAX_TOP_ACTIONS = 3;

/** Google Calendar event duration in milliseconds (1 hour). */
const CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000;

/** Default hour for calendar reminder events. */
const CALENDAR_DEFAULT_START_HOUR = 9;

/** Default hour for election day calendar event. */
const ELECTION_DAY_START_HOUR = 8;

/** Default duration for election day event in hours. */
const ELECTION_DAY_DURATION_HOURS = 1;

/** localStorage key for form draft. */
const STORAGE_KEY = "ballotbuddy-form-draft";

/** CSP nonce placeholder (updated at build time if needed). */
const CSP_NONCE = "";

/** Allowed voting methods. */
const VOTING_METHODS = Object.freeze({
  MAIL: "mail",
  EARLY: "early",
  IN_PERSON: "in_person"
});

/** Allowed registration statuses. */
const REGISTRATION_STATUSES = Object.freeze({
  REGISTERED: "registered",
  NOT_REGISTERED: "not_registered",
  UNKNOWN: "unknown"
});

/** Allowed accessibility needs. */
const ACCESSIBILITY_NEEDS = Object.freeze({
  NONE: "none",
  MOBILITY: "mobility",
  VISION: "vision",
  LANGUAGE: "language"
});

/** Allowed age groups. */
const AGE_GROUPS = Object.freeze({
  YOUNG: "18_24",
  ADULT: "25_44",
  MIDDLE: "45_64",
  SENIOR: "65_plus"
});

/** Allowed main concerns. */
const MAIN_CONCERNS = Object.freeze({
  DEADLINES: "deadlines",
  ID_RULES: "id_rules",
  WHERE_TO_VOTE: "where_to_vote",
  MAIL_BALLOT: "mail_ballot",
  CONFIDENCE: "confidence"
});



/* validation.js */
/**
 * Input validation and sanitization layer for BallotBuddy.
 * Prevents XSS, prototype pollution, and injection attacks.
 * @module validation
 */


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
function sanitizeString(value, maxLength = 200) {
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
function validateDaysUntilElection(value) {
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
function validateEnum(value, enumObj, defaultValue) {
  const cleanValue = sanitizeString(value, 40);
  const allowedValues = Object.values(enumObj);
  return allowedValues.includes(cleanValue) ? cleanValue : defaultValue;
}

/**
 * Validates and sanitizes form data completely.
 * @param {Object} rawData - Raw form data object.
 * @returns {Object} Sanitized and validated form data.
 */
function validateFormData(rawData) {
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
    showGoogleServices: data.showGoogleServices === "off" ? "off" : "on"
  };
}

/**
 * Validates a question string for the Q&A feature.
 * @param {string} question - Raw question input.
 * @returns {string} Sanitized question.
 */
function validateQuestion(question) {
  return sanitizeString(question, 300);
}

/**
 * Checks if a string contains suspicious content.
 * @param {string} value - Value to check.
 * @returns {boolean} True if suspicious content detected.
 */
function containsSuspiciousContent(value) {
  if (typeof value !== "string") {
    return false;
  }
  return SCRIPT_PATTERN.test(value) ||
    EVENT_HANDLER_PATTERN.test(value) ||
    URL_ATTACK_PATTERN.test(value);
}


/* utils.js */
/**
 * Shared utility functions for BallotBuddy.
 * @module utils
 */


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
function escapeHtml(value) {
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
function uniqueItems(items) {
  return [...new Set(items)];
}

/**
 * Formats a date for Google Calendar (UTC, yyyymmddThhmmssZ).
 * @param {Date} date - Date to format.
 * @returns {string} Formatted calendar date string.
 */
function formatCalendarDate(date) {
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
function formatRelativeMilestoneDate(electionDate, offsetDays) {
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
function createDateAtHour(date, hour) {
  const nextDate = new Date(date);
  nextDate.setHours(hour, 0, 0, 0);
  return nextDate;
}

/**
 * Formats a voting method key into a human-readable label.
 * @param {string} method - Voting method key.
 * @returns {string} Human-readable label.
 */
function formatVotingMethod(method) {
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
function debounce(fn, delay = 300) {
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
function secureSetItem(key, value) {
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
function secureGetItem(key) {
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
function htmlToFragment(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Announces a message to screen readers via an ARIA live region.
 * @param {string} message - Message to announce.
 * @param {string} [priority="polite"] - Priority level.
 */
function announceToScreenReader(message, priority = "polite") {
  const announcer = document.getElementById("sr-announcer");
  if (announcer) {
    announcer.setAttribute("aria-live", priority);
    announcer.textContent = message;
  }
}



/* logic.js */
/**
 * BallotBuddy election planning logic module.
 * Contains all decision-making, scoring, and plan generation logic.
 * @module logic
 */




/** Map of user concerns to insight messages. */
const concernMap = {
  deadlines: "You care most about timing, so the plan prioritizes the next critical cutoff.",
  id_rules: "You flagged document uncertainty, so the checklist highlights identity and verification prep.",
  where_to_vote: "You want location clarity, so the assistant emphasizes polling-place lookup and travel readiness.",
  mail_ballot: "You want a safer absentee path, so the plan focuses on request, return, and tracking steps.",
  confidence: "You want the whole process explained clearly, so the assistant adds more context and confidence-building guidance."
};

/**
 * Builds a complete election plan based on user form data.
 * @param {Object} rawFormData - Raw form data from the UI.
 * @returns {Object} Complete election plan object.
 */
function buildElectionPlan(rawFormData) {
  const formData = validateFormData(rawFormData);
  const daysLeft = formData.daysUntilElection;
  const name = formData.name || "Voter";
  const electionDate = new Date(Date.now() + daysLeft * DAY_MS);

  const persona = resolvePersona(formData);
  const checklist = buildChecklist(formData, daysLeft);
  const timeline = buildTimeline(formData, daysLeft);
  const risks = buildRisks(formData, daysLeft);
  const googleSuggestions = buildGoogleSuggestions(formData);

  const readiness = buildReadinessModel({
    formData,
    daysLeft,
    checklist,
    risks
  });

  const milestones = buildMilestones({
    formData,
    daysLeft,
    electionDate,
    checklist
  });

  const calendarLinks = formData.wantsReminders === "on"
    ? buildCalendarLinks({ name, milestones, electionDate })
    : [];

  const quickLinks = buildGoogleQuickLinks({
    address: formData.address,
    mainConcern: formData.mainConcern,
    accessibilityNeed: formData.accessibilityNeed,
    electionDate,
    name
  });
  const googleWorkflow = buildGoogleWorkflow({
    formData,
    milestones,
    quickLinks
  });
  const officialLookupLinks = buildOfficialLookupLinks(formData);

  const generatedCard = buildGeneratedCard({
    name,
    formData,
    persona,
    readiness,
    checklist,
    milestones,
    quickLinks
  });

  return {
    name,
    persona,
    summary: `${name}, your assistant identified you as a ${persona.label}. ${persona.description}`,
    checklist,
    timeline,
    risks,
    googleSuggestions,
    googleWorkflow,
    narrative: buildNarrative({ name, persona, daysLeft, formData }),
    concernInsight: concernMap[formData.mainConcern] || concernMap.confidence,
    readiness,
    milestones,
    calendarLinks,
    quickLinks,
    officialLookupLinks,
    googleServicesEnabled: formData.showGoogleServices === "on",
    generatedCard
  };
}

/**
 * Builds the prioritized checklist based on user context.
 * @param {Object} formData - Validated form data.
 * @param {number} daysLeft - Days until election.
 * @returns {string[]} Prioritized checklist items.
 */
function buildChecklist(formData, daysLeft) {
  const checklist = [];

  checklist.push("Confirm your voter status for your current address so you start from verified information.");

  if (formData.registrationStatus !== REGISTRATION_STATUSES.REGISTERED) {
    checklist.unshift("Check registration immediately and complete registration if your state still allows it.");
  } else {
    checklist.push("Review your registration record once more to make sure your address and district are correct.");
  }

  if (formData.movedRecently === "yes") {
    checklist.push("Update or confirm your address because moving can change your district, ballot, and polling location.");
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    checklist.push("Request or confirm your mail ballot and set a personal return deadline earlier than the official deadline.");
    checklist.push("Track your ballot status after mailing or dropping it off.");
  }

  if (formData.votingMethod === VOTING_METHODS.EARLY) {
    checklist.push("Look up early-voting dates and choose a lower-stress day before election day crowds build.");
  }

  if (formData.votingMethod === VOTING_METHODS.IN_PERSON) {
    checklist.push("Prepare what you need for election day: ID if required, polling location, and travel time buffer.");
  }

  if (formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE) {
    checklist.push("Contact your local election office early to confirm accessible equipment, language help, or curbside options.");
  }

  if (formData.ageGroup === AGE_GROUPS.YOUNG) {
    checklist.push("Review first-time voter rules carefully because ID, signature, or residency proof may be different for new voters.");
  }

  if (formData.ageGroup === AGE_GROUPS.SENIOR) {
    checklist.push("Choose the least stressful voting path early, especially if transport, queues, or energy levels matter.");
  }

  checklist.push("Save the final checklist on your phone so you can act without re-reading the full guide later.");

  return uniqueItems(checklist);
}

/**
 * Builds the action timeline based on user context.
 * @param {Object} formData - Validated form data.
 * @param {number} daysLeft - Days until election.
 * @returns {string[]} Timeline items.
 */
function buildTimeline(formData, daysLeft) {
  const timeline = [];

  timeline.push("Today: verify registration, election date, and the voting method you intend to use.");

  if (formData.movedRecently === "yes") {
    timeline.push(daysLeft <= 10
      ? "Within 24 hours: resolve any address mismatch before you make other voting plans."
      : "This week: confirm whether your move requires a new registration or an address correction.");
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    timeline.push(daysLeft <= 7
      ? "Right now: if mail timing looks risky, switch to an official drop box or in-person backup plan."
      : "Before the final week: receive, complete, seal, and return your ballot with tracking.");
  }

  if (formData.votingMethod === VOTING_METHODS.EARLY) {
    timeline.push("Before election day: attend early voting with ID and confirmation details if required.");
  }

  if (formData.votingMethod === VOTING_METHODS.IN_PERSON) {
    timeline.push("Election day minus 1 day: double-check polling hours, route, and backup transport.");
  }

  if (daysLeft <= URGENCY_THRESHOLDS.VERY_CLOSE) {
    timeline.push("Within 48 hours: finish every step that could stop you from voting, including registration, address, and ballot requests.");
  } else if (daysLeft <= URGENCY_THRESHOLDS.CLOSE) {
    timeline.push("Within 7 days: complete all setup tasks so the last week is only for confirmation and voting.");
  } else {
    timeline.push("Over the next 2 weeks: complete setup early and use the final week only for verification.");
  }

  return uniqueItems(timeline);
}

/**
 * Builds risk warnings based on user context.
 * @param {Object} formData - Validated form data.
 * @param {number} daysLeft - Days until election.
 * @returns {string[]} Risk warning items.
 */
function buildRisks(formData, daysLeft) {
  const risks = [];

  if (formData.registrationStatus !== REGISTRATION_STATUSES.REGISTERED) {
    risks.push(daysLeft <= 14
      ? "Registration may already be close to the deadline or closed in some regions."
      : "Registration rules vary by state, so leaving this for later could block voting.");
  }

  if (formData.movedRecently === "yes") {
    risks.push("A recent move is one of the biggest reasons people show up at the wrong polling place.");
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    risks.push("Mail voting fails most often when voters request or return the ballot too late.");
  }

  if (formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE) {
    risks.push("Accessibility support is available in many places, but it works best when arranged before the last minute.");
  }

  if (daysLeft <= URGENCY_THRESHOLDS.VERY_CLOSE) {
    risks.push("You are in a late-stage window, so every unresolved item should be treated as urgent.");
  }

  return risks.length
    ? uniqueItems(risks)
    : ["No major blockers were detected yet, but you should still verify official local rules and deadlines."];
}

/**
 * Builds Google service suggestions based on user context.
 * @param {Object} formData - Validated form data.
 * @returns {Object[]} Google suggestion objects.
 */
function buildGoogleSuggestions(formData) {
  if (formData.showGoogleServices !== "on") {
    return [];
  }

  const suggestions = [
    {
      title: "Google Civic Information API",
      body: "Enrich the assistant with official election details, polling locations, early-voting sites, drop boxes, and representative data from an address."
    },
    {
      title: "Google Maps",
      body: "Open travel-ready routes for polling places, early-voting centers, ballot drop boxes, and election offices."
    },
    {
      title: "Google Calendar",
      body: "Convert milestones into actionable reminders for registration checks, ballot return windows, and election-day logistics."
    },
    {
      title: "Google Search",
      body: "Launch prefilled official-information searches focused on registration status, polling-place confirmation, and election-office help."
    }
  ];

  if (formData.accessibilityNeed === ACCESSIBILITY_NEEDS.LANGUAGE) {
    suggestions.push({
      title: "Google Translate",
      body: "Support multilingual guidance for key instructions and official election information."
    });
  }

  return suggestions;
}

/**
 * Builds workflow cards that connect the plan to Google services.
 * @param {Object} params - Parameters object.
 * @param {Object} params.formData - Validated form data.
 * @param {Object[]} params.milestones - Generated milestones.
 * @param {Object[]} params.quickLinks - Existing quick links.
 * @returns {Object[]} Workflow items.
 */
function buildGoogleWorkflow({ formData, milestones, quickLinks }) {
  if (formData.showGoogleServices !== "on") {
    return [];
  }

  const firstMilestone = milestones[0];
  const mapsLink = quickLinks.find((item) => item.title.includes("Maps"));
  const calendarLink = quickLinks.find((item) => item.title.includes("Calendar"));
  const translateLink = quickLinks.find((item) => item.title.includes("Translate"));

  const workflow = [
    {
      title: "1. Verify with official Google search",
      body: "Start the plan with a search query focused on official election offices and polling-place details for your area.",
      actionLabel: "Open official search",
      href: buildOfficialElectionSearchLink(formData.address)
    }
  ];

  if (mapsLink) {
    workflow.push({
      title: "2. Save your route in Google Maps",
      body: "Lock in a route early so voting-day travel, parking, and timing are not left to guesswork.",
      actionLabel: "Open Maps route",
      href: mapsLink.href
    });
  }

  if (calendarLink && firstMilestone) {
    workflow.push({
      title: "3. Put the next milestone on your calendar",
      body: `The assistant already identified "${firstMilestone.title}" as the next milestone. Save it to Google Calendar so the plan becomes time-bound.`,
      actionLabel: "Create calendar hold",
      href: calendarLink.href
    });
  }

  if (translateLink) {
    workflow.push({
      title: "4. Translate important instructions",
      body: "For language support, Google Translate can help review official voter instructions before you act.",
      actionLabel: "Open Google Translate",
      href: translateLink.href
    });
  }

  return workflow.slice(0, 4);
}

/**
 * Builds official election lookup shortcuts using Google Search and Maps.
 * @param {Object} formData - Validated form data.
 * @returns {Object[]} Shortcut items.
 */
function buildOfficialLookupLinks(formData) {
  if (formData.showGoogleServices !== "on") {
    return [];
  }

  const address = formData.address?.trim();
  const links = [
    {
      title: "Find your election office",
      body: "Search for the nearest official election office using a query weighted toward government sources.",
      actionLabel: "Search election office",
      href: buildOfficialElectionSearchLink(address)
    },
    {
      title: "Check voter registration",
      body: "Use Google Search to locate the official voter-registration lookup or state elections portal for your area.",
      actionLabel: "Search registration lookup",
      href: buildOfficialRegistrationSearchLink(address)
    }
  ];

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    links.push({
      title: "Track ballot return options",
      body: "Search for official mail-ballot tracking, drop-box, and return guidance close to your location.",
      actionLabel: "Search ballot tracking",
      href: buildOfficialBallotSearchLink(address)
    });
  } else {
    links.push({
      title: "Confirm polling place logistics",
      body: "Search for official polling-place hours, changes, and election-day instructions for the current address.",
      actionLabel: "Search polling updates",
      href: buildOfficialPollingSearchLink(address)
    });
  }

  if (address) {
    links.push({
      title: "Open the area in Google Maps",
      body: "Review route, commute time, and nearby election services in Google Maps before the final rush.",
      actionLabel: "Open Google Maps",
      href: buildMapsLink(address)
    });
  }

  return links.slice(0, 4);
}

/**
 * Resolves the user's persona based on form data.
 * @param {Object} formData - Validated form data.
 * @returns {Object} Persona object with key, label, and description.
 */
function resolvePersona(formData) {
  if (formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE) {
    return {
      key: "accessibility",
      label: "voter needing accessible support",
      description: "The plan prioritizes accommodations, support services, and lower-friction voting paths."
    };
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    return {
      key: "absentee",
      label: "mail or absentee voter",
      description: "The plan emphasizes ballot request timing, secure return, and ballot tracking."
    };
  }

  if (formData.movedRecently === "yes") {
    return {
      key: "moved",
      label: "recently moved voter",
      description: "The plan focuses on address validation, district changes, and avoiding polling-place confusion."
    };
  }

  if (formData.ageGroup === AGE_GROUPS.YOUNG || formData.registrationStatus !== REGISTRATION_STATUSES.REGISTERED) {
    return {
      key: "first_time",
      label: "first-time or uncertain voter",
      description: "The plan explains the process in simple steps and treats every prerequisite as a guided action."
    };
  }

  return {
    key: "general",
    label: "prepared voter",
    description: "The plan focuses on confirmation, timing, and smooth execution."
  };
}

/**
 * Builds a Google Maps search link from an address.
 * @param {string} address - Raw address string.
 * @returns {string} Google Maps URL or empty string.
 */
function buildMapsLink(address) {
  if (!address?.trim()) {
    return "";
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

/**
 * Builds an official-election-focused Google Search link.
 * @param {string} address - Optional address or ZIP code.
 * @returns {string} Google Search URL.
 */
function buildOfficialElectionSearchLink(address) {
  const query = address?.trim()
    ? `${address.trim()} official election office polling place site:.gov`
    : "official election office polling place site:.gov";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds a Google Search link for voter registration lookup.
 * @param {string} address - Optional address or ZIP code.
 * @returns {string} Google Search URL.
 */
function buildOfficialRegistrationSearchLink(address) {
  const query = address?.trim()
    ? `${address.trim()} official voter registration lookup site:.gov`
    : "official voter registration lookup site:.gov";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds a Google Search link for polling-place updates.
 * @param {string} address - Optional address or ZIP code.
 * @returns {string} Google Search URL.
 */
function buildOfficialPollingSearchLink(address) {
  const query = address?.trim()
    ? `${address.trim()} official polling place hours election day site:.gov`
    : "official polling place hours election day site:.gov";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds a Google Search link for mail-ballot support.
 * @param {string} address - Optional address or ZIP code.
 * @returns {string} Google Search URL.
 */
function buildOfficialBallotSearchLink(address) {
  const query = address?.trim()
    ? `${address.trim()} official mail ballot tracking drop box site:.gov`
    : "official mail ballot tracking drop box site:.gov";
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Answers an election-related question based on the current plan.
 * @param {string} question - User's question.
 * @param {Object} plan - Current election plan.
 * @param {Object} formData - Validated form data.
 * @returns {string} Answer text.
 */
function answerElectionQuestion(question, plan, formData) {
  const normalized = (question || "").toLowerCase();

  if (!normalized.trim()) {
    return "Ask me about your next step, biggest risk, mail-ballot timing, where to vote, or how to prepare for election day.";
  }

  if (normalized.includes("first") || normalized.includes("start") || normalized.includes("do first")) {
    return `Start with this: ${plan.checklist[0]} After that, move to ${plan.checklist[1] || "your next checklist item"}.`;
  }

  if (normalized.includes("risk") || normalized.includes("wrong") || normalized.includes("problem")) {
    return `Your biggest risk right now is: ${plan.risks[0]} ${plan.risks[1] ? `A second risk is: ${plan.risks[1]}` : ""}`;
  }

  if (normalized.includes("week") || normalized.includes("timeline") || normalized.includes("when")) {
    return `This week, focus on: ${plan.timeline[0]} ${plan.timeline[1] ? `Then: ${plan.timeline[1]}` : ""}`;
  }

  if (normalized.includes("ready") || normalized.includes("score")) {
    return `Your election readiness score is ${plan.readiness.score} out of 100, which BallotBuddy rates as ${plan.readiness.band.label.toLowerCase()}. ${plan.readiness.summary}`;
  }

  if (normalized.includes("reminder") || normalized.includes("calendar")) {
    return plan.calendarLinks.length
      ? `I created reminder links for your next milestones, starting with ${plan.calendarLinks[0].title}. Open the Google Calendar section to save them.`
      : "Turn on reminder-friendly planning in the form and BallotBuddy will generate Google Calendar links for your next milestones.";
  }

  if (normalized.includes("mail") || normalized.includes("absentee")) {
    return formData.votingMethod === VOTING_METHODS.MAIL
      ? "Because you chose mail voting, request or confirm the ballot immediately, return it early, and track it after sending."
      : "You are not currently on the mail-voting path, but you could switch if your local rules allow it and timing still works.";
  }

  if (normalized.includes("where") || normalized.includes("location") || normalized.includes("polling")) {
    return formData.address?.trim()
      ? "Use the Google Maps link in your summary for your area, then verify your official polling place through your local election office."
      : "Add your address or ZIP code so the assistant can give you a location-aware voting plan and Maps link.";
  }

  if (normalized.includes("id") || normalized.includes("document")) {
    return "Bring any identification your state may require, plus a backup proof-of-address document if you recently moved or are unsure about your registration details.";
  }

  if (normalized.includes("election day") || normalized.includes("prepare") || normalized.includes("voting day")) {
    return formData.votingMethod === VOTING_METHODS.IN_PERSON
      ? "Before election day, confirm polling hours, route, transport backup, and any ID you may need. Save the address on your phone so you can leave without friction."
      : "Even if you are not voting in person, keep a backup plan in case your original method becomes risky close to the deadline.";
  }

  if (normalized.includes("accessibility") || normalized.includes("language") || normalized.includes("help")) {
    return formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE
      ? "Because you flagged a support need, contact your local election office early to confirm the exact accommodation available at your location."
      : "If you need mobility, vision, or language support, update your form selection and the assistant will adapt your checklist.";
  }

  return `${plan.narrative} Your strongest next move is: ${plan.checklist[0]}`;
}

/**
 * Builds a narrative explanation for the user.
 * @param {Object} params - Parameters object.
 * @param {string} params.name - User's name.
 * @param {Object} params.persona - Resolved persona.
 * @param {number} params.daysLeft - Days until election.
 * @param {Object} params.formData - Validated form data.
 * @returns {string} Narrative text.
 */
function buildNarrative({ name, persona, daysLeft, formData }) {
  const urgency = daysLeft <= URGENCY_THRESHOLDS.VERY_CLOSE
    ? "This is a high-urgency situation, so the assistant is pushing you toward actions you can complete immediately."
    : daysLeft <= URGENCY_THRESHOLDS.CLOSE
      ? "There is still enough time, but only if you handle the key administrative steps now."
      : "You have useful runway, which means you can build a safer plan instead of reacting at the last minute.";

  const votingPath = formData.votingMethod === VOTING_METHODS.MAIL
    ? "Because you prefer voting by mail, the biggest goal is to remove delivery and return risk."
    : formData.votingMethod === VOTING_METHODS.EARLY
      ? "Because you prefer early voting, the assistant is trying to shift your effort earlier and reduce election day pressure."
      : "Because you prefer voting in person, the assistant is optimizing for preparation, location certainty, and a smooth voting-day experience.";

  return [
    `${name}, you were matched to the ${persona.label} journey.`,
    urgency,
    votingPath,
    concernMap[formData.mainConcern] || concernMap.confidence
  ].join(" ");
}

/**
 * Builds the readiness scoring model.
 * @param {Object} params - Parameters object.
 * @param {Object} params.formData - Validated form data.
 * @param {number} params.daysLeft - Days until election.
 * @param {string[]} params.checklist - Checklist items.
 * @param {string[]} params.risks - Risk items.
 * @returns {Object} Readiness model with score, band, blockers, summary, and riskCount.
 */
function buildReadinessModel({ formData, daysLeft, checklist, risks }) {
  let score = 100;
  const blockers = [];

  if (formData.registrationStatus === REGISTRATION_STATUSES.NOT_REGISTERED) {
    score -= READINESS_PENALTIES.NOT_REGISTERED;
    blockers.push("Registration is still unresolved.");
  } else if (formData.registrationStatus !== REGISTRATION_STATUSES.REGISTERED) {
    score -= READINESS_PENALTIES.UNKNOWN_REGISTRATION;
    blockers.push("Registration status still needs verification.");
  }

  if (formData.movedRecently === "yes") {
    score -= READINESS_PENALTIES.MOVED_RECENTLY;
    blockers.push("A recent move can invalidate the address on file.");
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    score -= daysLeft <= URGENCY_THRESHOLDS.VERY_CLOSE
      ? READINESS_PENALTIES.MAIL_VOTING_LATE
      : READINESS_PENALTIES.MAIL_VOTING_EARLY;
    blockers.push("Mail voting depends on faster turnaround and ballot tracking.");
  }

  if (formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE) {
    score -= daysLeft <= URGENCY_THRESHOLDS.CLOSE
      ? READINESS_PENALTIES.ACCESSIBILITY_LATE
      : READINESS_PENALTIES.ACCESSIBILITY_EARLY;
    blockers.push("Accommodation details should be confirmed ahead of time.");
  }

  if (!formData.address?.trim()) {
    score -= READINESS_PENALTIES.MISSING_ADDRESS;
    blockers.push("Location details are missing, so polling logistics are less reliable.");
  }

  if (daysLeft <= URGENCY_THRESHOLDS.VERY_CLOSE) {
    score -= READINESS_PENALTIES.ELECTION_VERY_CLOSE;
    blockers.push("The election is very close, so delays matter more.");
  } else if (daysLeft <= URGENCY_THRESHOLDS.CLOSE) {
    score -= READINESS_PENALTIES.ELECTION_CLOSE;
  } else if (daysLeft <= URGENCY_THRESHOLDS.MODERATE) {
    score -= READINESS_PENALTIES.ELECTION_MODERATE;
  }

  score = Math.max(READINESS_THRESHOLDS.MINIMUM, Math.min(98, score));

  const band = score >= READINESS_THRESHOLDS.STRONG
    ? {
        label: "Strong",
        tone: "good",
        description: "You are in good shape, with most risk coming from final confirmation."
      }
    : score >= READINESS_THRESHOLDS.NEEDS_ATTENTION
      ? {
          label: "Needs attention",
          tone: "watch",
          description: "You have a workable path, but a few unresolved steps could still cause friction."
        }
      : {
          label: "Urgent",
          tone: "risk",
          description: "Your plan needs immediate action to avoid deadline or logistics problems."
        };

  return {
    score,
    band,
    blockers: blockers.slice(0, 3),
    summary: `${band.description} ${checklist[0] ? `Start with: ${checklist[0]}` : ""}`.trim(),
    riskCount: risks.length
  };
}

/**
 * Builds milestone items for the user's plan.
 * @param {Object} params - Parameters object.
 * @param {Object} params.formData - Validated form data.
 * @param {number} params.daysLeft - Days until election.
 * @param {Date} params.electionDate - Calculated election date.
 * @param {string[]} params.checklist - Checklist items.
 * @returns {Object[]} Milestone objects.
 */
function buildMilestones({ formData, daysLeft, electionDate, checklist }) {
  const items = [];

  items.push({
    title: "Verify voter record",
    timingLabel: daysLeft <= 10 ? "Today" : "Within 48 hours",
    offsetDays: daysLeft <= 10 ? daysLeft : Math.max(daysLeft - 2, 0),
    detail: checklist[0] || "Confirm registration, address, and election details."
  });

  if (formData.registrationStatus !== REGISTRATION_STATUSES.REGISTERED) {
    items.push({
      title: "Resolve registration status",
      timingLabel: daysLeft <= 14 ? "Within 24 hours" : "This week",
      offsetDays: daysLeft <= 14 ? Math.max(daysLeft - 1, 0) : Math.max(daysLeft - 7, 0),
      detail: "Finish registration or confirm that your current registration is active."
    });
  }

  if (formData.votingMethod === VOTING_METHODS.MAIL) {
    items.push({
      title: "Return or track ballot",
      timingLabel: daysLeft <= 7 ? "Right now" : "Before the final week",
      offsetDays: daysLeft <= 7 ? daysLeft : 7,
      detail: "Use a safer return path and check tracking rather than waiting until the deadline."
    });
  } else if (formData.votingMethod === VOTING_METHODS.EARLY) {
    items.push({
      title: "Choose your early-voting window",
      timingLabel: "Before election week",
      offsetDays: Math.max(Math.min(daysLeft, 10), 0),
      detail: "Pick a lower-stress day and save directions before turnout spikes."
    });
  } else {
    items.push({
      title: "Lock in voting-day logistics",
      timingLabel: "1 day before election",
      offsetDays: 1,
      detail: "Double-check the route, polling hours, ID, and backup transport."
    });
  }

  if (formData.movedRecently === "yes") {
    items.push({
      title: "Confirm your correct district",
      timingLabel: daysLeft <= 10 ? "Today" : "Within 72 hours",
      offsetDays: daysLeft <= 10 ? daysLeft : Math.max(daysLeft - 3, 0),
      detail: "A recent move can change the ballot you are eligible to receive."
    });
  }

  if (formData.accessibilityNeed !== ACCESSIBILITY_NEEDS.NONE) {
    items.push({
      title: "Confirm accommodations",
      timingLabel: daysLeft <= 14 ? "This week" : "2 weeks before election day",
      offsetDays: daysLeft <= 14 ? Math.max(daysLeft - 7, 0) : 14,
      detail: "Call early to confirm language, mobility, curbside, or assistive equipment support."
    });
  }

  items.push({
    title: "Final readiness check",
    timingLabel: "Election eve",
    offsetDays: 1,
    detail: "Review your saved checklist, directions, and documents one last time."
  });

  return items
    .slice(0, MAX_MILESTONES)
    .map((item) => ({
      ...item,
      dateLabel: formatRelativeMilestoneDate(electionDate, item.offsetDays)
    }));
}

/**
 * Builds Google Calendar reminder links from milestones.
 * @param {Object} params - Parameters object.
 * @param {string} params.name - User's name.
 * @param {Object[]} params.milestones - Milestone items.
 * @param {Date} params.electionDate - Election date.
 * @returns {Object[]} Calendar link objects.
 */
function buildCalendarLinks({ name, milestones, electionDate }) {
  return milestones.slice(0, MAX_CALENDAR_LINKS).map((item, index) => {
    const eventDate = new Date(electionDate.getTime() - item.offsetDays * DAY_MS);
    eventDate.setHours(CALENDAR_DEFAULT_START_HOUR + index, 0, 0, 0);

    const endDate = new Date(eventDate.getTime() + CALENDAR_EVENT_DURATION_MS);
    const title = `${item.title} for ${name}`;
    const details = `${item.detail} BallotBuddy milestone: ${item.timingLabel}.`;

    return {
      title: item.title,
      label: `${item.timingLabel} (${item.dateLabel})`,
      href: buildGoogleCalendarLink({
        title,
        details,
        startDate: eventDate,
        endDate
      })
    };
  });
}

/**
 * Builds Google quick action links.
 * @param {Object} params - Parameters object.
 * @param {string} params.address - User's address.
 * @param {string} params.mainConcern - Main concern key.
 * @param {string} params.accessibilityNeed - Accessibility need key.
 * @param {Date} params.electionDate - Election date.
 * @param {string} params.name - User's name.
 * @returns {Object[]} Quick link objects.
 */
function buildGoogleQuickLinks({ address, mainConcern, accessibilityNeed, electionDate, name }) {
  const trimmedAddress = address?.trim();
  const formattedElectionDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(electionDate);

  const officialSearchQuery = trimmedAddress
    ? `${trimmedAddress} official election office polling place`
    : "official election office polling place voter guide";

  const quickLinks = [
    {
      title: "Search official local election info",
      body: "Open a Google Search query tuned for official polling-place and election-office information.",
      href: `https://www.google.com/search?q=${encodeURIComponent(officialSearchQuery)}`
    }
  ];

  if (trimmedAddress) {
    quickLinks.unshift({
      title: "Open location in Google Maps",
      body: "Use Maps to review the area, travel time, and voting-day route.",
      href: buildMapsLink(trimmedAddress)
    });
  }

  quickLinks.push({
    title: "Add election day to Google Calendar",
    body: `Create a calendar hold for election day on ${formattedElectionDate}.`,
    href: buildGoogleCalendarLink({
      title: `Election day for ${name}`,
      details: "Block time for voting, route checks, and final document review.",
      startDate: createDateAtHour(electionDate, ELECTION_DAY_START_HOUR),
      endDate: createDateAtHour(electionDate, ELECTION_DAY_START_HOUR + ELECTION_DAY_DURATION_HOURS)
    })
  });

  if (accessibilityNeed === ACCESSIBILITY_NEEDS.LANGUAGE) {
    quickLinks.push({
      title: "Translate key voting instructions",
      body: "Open Google Translate to help review official voting instructions in another language.",
      href: `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent("I need official voting instructions and ballot guidance.")}&op=translate`
    });
  }

  if (mainConcern === MAIN_CONCERNS.WHERE_TO_VOTE) {
    quickLinks.push({
      title: "Search polling place updates",
      body: "Use Google Search to confirm any location or hours changes close to election day.",
      href: `https://www.google.com/search?q=${encodeURIComponent("polling place hours election day official")}`
    });
  }

  return quickLinks.slice(0, MAX_QUICK_LINKS);
}

/**
 * Builds a Google Calendar event link.
 * @param {Object} params - Parameters object.
 * @param {string} params.title - Event title.
 * @param {string} params.details - Event details.
 * @param {Date} params.startDate - Start date.
 * @param {Date} params.endDate - End date.
 * @returns {string} Google Calendar URL.
 */
function buildGoogleCalendarLink({ title, details, startDate, endDate }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    dates: `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Builds the generated voter action card.
 * @param {Object} params - Parameters object.
 * @param {string} params.name - User's name.
 * @param {Object} params.formData - Validated form data.
 * @param {Object} params.persona - Resolved persona.
 * @param {Object} params.readiness - Readiness model.
 * @param {string[]} params.checklist - Checklist items.
 * @param {Object[]} params.milestones - Milestone items.
 * @param {Object[]} params.quickLinks - Quick link items.
 * @returns {Object} Generated card object.
 */
function buildGeneratedCard({ name, formData, persona, readiness, checklist, milestones, quickLinks }) {
  return {
    title: `${name}'s BallotBuddy card`,
    voterLabel: name,
    personaLabel: persona.label,
    readinessLabel: `${readiness.score}/100`,
    readinessTone: readiness.band.label,
    votingMethod: formatVotingMethod(formData.votingMethod),
    priorityLine: checklist[0] || "Review your plan and confirm the next required step.",
    topActions: checklist.slice(0, MAX_TOP_ACTIONS),
    milestoneLine: milestones[0]
      ? `${milestones[0].title} - ${milestones[0].timingLabel}`
      : "No milestone generated yet.",
    quickLinks: quickLinks.slice(0, 3)
  };
}


/* google-civic.js */
/**
 * Google Civic Information API integration module.
 * Provides graceful fallback when no API key is available.
 * @module google-civic
 */

/**
 * Fetches voter information from Google Civic Information API.
 * @param {string} address - Voter's address.
 * @param {string} [apiKey=""] - Google Civic API key.
 * @param {string} [electionId=""] - Optional election ID when a specific election must be targeted.
 * @returns {Promise<Object|null>} Voter information or null.
 */
async function fetchVoterInfo(address, apiKey = "", electionId = "") {
  if (!address?.trim() || !apiKey) {
    return null;
  }

  try {
    const url = new URL("https://www.googleapis.com/civicinfo/v2/voterinfo");
    url.searchParams.set("address", address.trim());
    url.searchParams.set("key", apiKey);
    if (electionId?.trim()) {
      url.searchParams.set("electionId", electionId.trim());
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn("Civic API response not OK:", response.status);
      return null;
    }

    const data = await response.json();
    return normalizeVoterInfo(data);
  } catch (error) {
    console.warn("Failed to fetch voter info:", error);
    return null;
  }
}

/**
 * Fetches representative information from Google Civic API.
 * @param {string} address - Voter's address.
 * @param {string} [apiKey=""] - Google Civic API key.
 * @returns {Promise<Object|null>} Representative information or null.
 */
async function fetchRepresentatives(address, apiKey = "") {
  if (!address?.trim() || !apiKey) {
    return null;
  }

  try {
    const url = new URL("https://www.googleapis.com/civicinfo/v2/representatives");
    url.searchParams.set("address", address.trim());
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return normalizeRepresentatives(data);
  } catch (error) {
    console.warn("Failed to fetch representatives:", error);
    return null;
  }
}

/**
 * Normalizes raw voter info API response.
 * @param {Object} data - Raw API response.
 * @returns {Object} Normalized voter info.
 */
function normalizeVoterInfo(data) {
  if (!data) {
    return null;
  }

  return {
    election: data.election
      ? {
          name: data.election.name,
          electionDay: data.election.electionDay,
          ocdDivisionId: data.election.ocdDivisionId
        }
      : null,
    pollingLocations: (data.pollingLocations || []).map((loc) => ({
      address: formatAddress(loc.address),
      pollingHours: loc.pollingHours || "See local election office",
      startDate: loc.startDate || null,
      endDate: loc.endDate || null
    })),
    earlyVoteSites: (data.earlyVoteSites || []).map((site) => ({
      address: formatAddress(site.address),
      pollingHours: site.pollingHours || "See local election office"
    })),
    dropOffLocations: (data.dropOffLocations || []).map((loc) => ({
      address: formatAddress(loc.address),
      pollingHours: loc.pollingHours || "See local election office"
    })),
    contests: (data.contests || []).slice(0, 5).map((contest) => ({
      office: contest.office || "Unknown office",
      type: contest.type || "General"
    }))
  };
}

/**
 * Normalizes raw representatives API response.
 * @param {Object} data - Raw API response.
 * @returns {Object} Normalized representatives data.
 */
function normalizeRepresentatives(data) {
  if (!data) {
    return null;
  }

  const offices = data.offices || [];
  const officials = data.officials || [];

  return {
    normalizedInput: data.normalizedInput
      ? formatAddress(data.normalizedInput)
      : null,
    divisions: Object.entries(data.divisions || {}).map(([ocdId, division]) => ({
      ocdId,
      name: division.name || "Unknown division"
    })),
    representatives: offices.slice(0, 5).map((office) => {
      const officialIndices = office.officialIndices || [];
      return {
        office: office.name || "Unknown office",
        officials: officialIndices
          .map((idx) => officials[idx])
          .filter(Boolean)
          .map((official) => ({
            name: official.name || "Unknown",
            party: official.party || "Unknown",
            phones: official.phones || [],
            urls: official.urls || []
          }))
      };
    })
  };
}

/**
 * Formats an address object into a string.
 * @param {Object} address - Address object.
 * @returns {string} Formatted address string.
 */
function formatAddress(address) {
  if (!address) {
    return "";
  }
  const parts = [
    address.locationName,
    address.line1,
    address.line2,
    address.line3,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Builds a Google Civic API test URL to verify key validity.
 * @param {string} apiKey - API key to test.
 * @param {string} [electionId=""] - Optional election ID for preconfigured testing.
 * @returns {string} Test URL.
 */
function buildCivicTestUrl(apiKey, electionId = "") {
  const url = new URL("https://www.googleapis.com/civicinfo/v2/elections");
  url.searchParams.set("key", apiKey);
  if (electionId?.trim()) {
    url.searchParams.set("electionId", electionId.trim());
  }
  return url.toString();
}



/* app.js */
/**
 * BallotBuddy application module.
 * Handles UI rendering, user interactions, and DOM updates.
 * @module app
 */





const form = document.getElementById("assistant-form");
const summaryEl = document.getElementById("summary");
const onboardingEl = document.getElementById("onboarding");
const generatedCardEl = document.getElementById("generatedCard");
const readinessScoreEl = document.getElementById("readinessScore");
const milestonesEl = document.getElementById("milestones");
const checklistEl = document.getElementById("checklist");
const timelineEl = document.getElementById("timeline");
const risksEl = document.getElementById("risks");
const narrativeEl = document.getElementById("narrative");
const googleSuggestionsEl = document.getElementById("googleSuggestions");
const googleWorkflowEl = document.getElementById("googleWorkflow");
const officialLookupLinksEl = document.getElementById("officialLookupLinks");
const calendarLinksEl = document.getElementById("calendarLinks");
const civicDataEl = document.getElementById("civicData");
const askButton = document.getElementById("ask-button");
const copyCardButton = document.getElementById("copyCardButton");
const printCardButton = document.getElementById("printCardButton");
const questionInput = document.getElementById("question-input");
const chatResultEl = document.getElementById("chat-result");
const toastContainer = document.getElementById("toast-container");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const quickQuestionButtons = document.querySelectorAll("[data-question]");
const appConfig = window.APP_CONFIG || {};
let civicRequestId = 0;

function readFormData() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function hasGeneratedProfile(formData) {
  return Boolean(formData.name?.trim() || formData.address?.trim());
}

function showToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function buildCardText(card) {
  return [
    card.title,
    `Journey: ${card.personaLabel}`,
    `Voting method: ${card.votingMethod}`,
    `Readiness: ${card.readinessLabel} (${card.readinessTone})`,
    `Priority action: ${card.priorityLine}`,
    `Next milestone: ${card.milestoneLine}`,
    `Top actions: ${card.topActions.join(" | ")}`
  ].join("\n");
}

function updateOnboardingVisibility(showProfile) {
  if (onboardingEl && summaryEl) {
    if (showProfile) {
      onboardingEl.style.display = "none";
      summaryEl.style.display = "";
    } else {
      onboardingEl.style.display = "";
      summaryEl.style.display = "none";
    }
  }
}

async function renderPlan(formData) {
  const plan = buildElectionPlan(formData);
  const mapsLink = buildMapsLink(formData.address);
  const shouldShowCard = hasGeneratedProfile(formData);

  updateOnboardingVisibility(shouldShowCard);

  renderSummary(plan, mapsLink);
  renderGeneratedCard(plan, shouldShowCard);
  renderReadiness(plan);
  renderMilestones(plan);
  renderChecklist(plan);
  renderTimeline(plan);
  renderRisks(plan);
  renderNarrative(plan);
  renderGoogleSuggestions(plan);
  renderGoogleWorkflow(plan);
  renderOfficialLookupLinks(plan);
  renderCalendarLinks(plan);
  await renderCivicData(plan, formData);
  resetChatResult();

  announceToScreenReader(
    `Your election plan is ready. Readiness score: ${plan.readiness.score} out of 100.`
  );
}

function renderSummary(plan, mapsLink) {
  const fragment = document.createDocumentFragment();

  const strong = document.createElement("p");
  strong.innerHTML = `<strong>${escapeHtml(plan.summary)}</strong>`;
  fragment.appendChild(strong);

  const concern = document.createElement("p");
  concern.textContent = plan.concernInsight;
  fragment.appendChild(concern);

  if (mapsLink) {
    const mapP = document.createElement("p");
    const link = document.createElement("a");
    link.href = mapsLink;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Open this address in Google Maps";
    mapP.appendChild(link);
    fragment.appendChild(mapP);
  }

  summaryEl.innerHTML = "";
  summaryEl.appendChild(fragment);
}

function renderGeneratedCard(plan, shouldShowCard) {
  if (shouldShowCard) {
    const card = plan.generatedCard;
    const html = `
      <div class="generated-card-header">
        <div>
          <p class="generated-card-kicker">Personal voter snapshot</p>
          <h4>${escapeHtml(card.title)}</h4>
        </div>
        <span class="card-badge card-${escapeHtml(card.readinessTone.toLowerCase())}">${escapeHtml(card.readinessTone)}</span>
      </div>
      <div class="generated-card-grid">
        <div>
          <p class="card-label">Voter</p>
          <p class="card-value">${escapeHtml(card.voterLabel)}</p>
        </div>
        <div>
          <p class="card-label">Journey</p>
          <p class="card-value">${escapeHtml(card.personaLabel)}</p>
        </div>
        <div>
          <p class="card-label">Voting method</p>
          <p class="card-value">${escapeHtml(card.votingMethod)}</p>
        </div>
        <div>
          <p class="card-label">Readiness</p>
          <p class="card-value">${escapeHtml(card.readinessLabel)}</p>
        </div>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Priority action</p>
        <p>${escapeHtml(card.priorityLine)}</p>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Next milestone</p>
        <p>${escapeHtml(card.milestoneLine)}</p>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Top actions</p>
        <ul class="card-list">
          ${card.topActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Google quick actions</p>
        <div class="generated-links">
          ${card.quickLinks
            .map((item) => `<a href="${item.href}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.title)}</a>`)
            .join("")}
        </div>
      </div>
    `;
    generatedCardEl.innerHTML = html;
  } else {
    generatedCardEl.innerHTML = `
      <div class="generated-card-empty">
        <h4>Your voter card will appear here</h4>
        <p>Add at least your name or location and BallotBuddy will generate a smart action card with Google shortcuts.</p>
      </div>
    `;
  }

  copyCardButton.disabled = !shouldShowCard;
  printCardButton.disabled = !shouldShowCard;
}

function renderReadiness(plan) {
  const readiness = plan.readiness;
  const angle = Math.round(readiness.score * 3.6);

  readinessScoreEl.innerHTML = `
    <div class="score-ring score-${escapeHtml(readiness.band.tone)}" style="--score-angle:${angle}deg;" role="img" aria-label="Readiness score: ${readiness.score} out of 100, rated ${readiness.band.label}">
      <span class="score-value">${escapeHtml(readiness.score)}</span>
      <span class="score-total">/100</span>
    </div>
    <p class="score-label">${escapeHtml(readiness.band.label)}</p>
    <p class="muted-text">${escapeHtml(readiness.summary)}</p>
    <p class="muted-text">Active risks detected: ${escapeHtml(readiness.riskCount)}</p>
  `;
}

function renderMilestones(plan) {
  const fragment = document.createDocumentFragment();

  for (const item of plan.milestones) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.timingLabel)} | ${escapeHtml(item.dateLabel)}</p>
      <p>${escapeHtml(item.detail)}</p>
    `;
    fragment.appendChild(li);
  }

  milestonesEl.innerHTML = "";
  milestonesEl.appendChild(fragment);
}

function renderChecklist(plan) {
  const fragment = document.createDocumentFragment();

  for (const item of plan.checklist) {
    const li = document.createElement("li");
    li.textContent = item;
    fragment.appendChild(li);
  }

  checklistEl.innerHTML = "";
  checklistEl.appendChild(fragment);
}

function renderTimeline(plan) {
  const fragment = document.createDocumentFragment();

  for (const item of plan.timeline) {
    const li = document.createElement("li");
    li.textContent = item;
    fragment.appendChild(li);
  }

  timelineEl.innerHTML = "";
  timelineEl.appendChild(fragment);
}

function renderRisks(plan) {
  const fragment = document.createDocumentFragment();

  for (const item of plan.risks) {
    const li = document.createElement("li");
    li.textContent = item;
    fragment.appendChild(li);
  }

  risksEl.innerHTML = "";
  risksEl.appendChild(fragment);
}

function renderNarrative(plan) {
  const p = document.createElement("p");
  p.textContent = plan.narrative;
  narrativeEl.innerHTML = "";
  narrativeEl.appendChild(p);
}

function renderGoogleSuggestions(plan) {
  if (!plan.googleServicesEnabled) {
    googleSuggestionsEl.innerHTML = `
      <article>
        <h4>Google integrations are currently hidden</h4>
        <p>Turn the Google services toggle back on to show workflow actions, official lookups, Calendar links, and Google Civic API guidance.</p>
      </article>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of plan.googleSuggestions) {
    const article = document.createElement("article");
    article.innerHTML = `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.body)}</p>
    `;
    fragment.appendChild(article);
  }

  googleSuggestionsEl.innerHTML = "";
  googleSuggestionsEl.appendChild(fragment);
}

function renderGoogleWorkflow(plan) {
  if (!plan.googleServicesEnabled) {
    googleWorkflowEl.innerHTML = `
      <article>
        <h4>Workflow hidden</h4>
        <p class="muted-text">Enable Google services in the form to see how BallotBuddy connects your plan to Google Search, Maps, Calendar, Translate, and official Civic data.</p>
      </article>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of plan.googleWorkflow) {
    const article = document.createElement("article");
    article.innerHTML = `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.body)}</p>
      <a href="${item.href}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.actionLabel)}</a>
    `;
    fragment.appendChild(article);
  }

  googleWorkflowEl.innerHTML = "";
  googleWorkflowEl.appendChild(fragment);
}

function renderOfficialLookupLinks(plan) {
  if (!plan.googleServicesEnabled) {
    officialLookupLinksEl.innerHTML = `
      <article>
        <h4>Official lookup links hidden</h4>
        <p class="muted-text">Enable Google services in the form to generate official election-office, registration, polling-place, and ballot-help shortcuts.</p>
      </article>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of plan.officialLookupLinks) {
    const article = document.createElement("article");
    article.innerHTML = `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.body)}</p>
      <a href="${item.href}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.actionLabel)}</a>
    `;
    fragment.appendChild(article);
  }

  officialLookupLinksEl.innerHTML = "";
  officialLookupLinksEl.appendChild(fragment);
}

function renderCalendarLinks(plan) {
  if (!plan.googleServicesEnabled) {
    calendarLinksEl.innerHTML = `
      <article>
        <p class="muted-text">Google Calendar links are hidden because Google services are turned off in the form.</p>
      </article>
    `;
    return;
  }

  if (!plan.calendarLinks.length) {
    calendarLinksEl.innerHTML = `
      <article>
        <p class="muted-text">Turn on reminder-friendly planning to generate Google Calendar links for your next milestones.</p>
      </article>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of plan.calendarLinks) {
    const article = document.createElement("article");
    article.innerHTML = `
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.label)}</p>
      <a href="${item.href}" target="_blank" rel="noreferrer noopener">Add to Google Calendar</a>
    `;
    fragment.appendChild(article);
  }

  calendarLinksEl.innerHTML = "";
  calendarLinksEl.appendChild(fragment);
}

function renderCivicLocationLinks(title, items) {
  if (!items.length) {
    return "";
  }

  return `
    <div class="civic-section">
      <h5>${escapeHtml(title)}</h5>
      <ul class="civic-list">
        ${items
          .slice(0, 3)
          .map((item) => {
            const mapsHref = buildMapsLink(item.address);
            return `
              <li>
                <strong>${escapeHtml(item.address || "Official location")}</strong>
                <p>${escapeHtml(item.pollingHours || "Check official election office hours.")}</p>
                ${mapsHref ? `<a href="${mapsHref}" target="_blank" rel="noreferrer noopener">Open in Google Maps</a>` : ""}
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderRepresentativeLinks(representatives) {
  const offices = representatives?.representatives || [];
  if (!offices.length) {
    return "";
  }

  return `
    <div class="civic-section">
      <h5>Representatives</h5>
      <ul class="civic-list">
        ${offices
          .slice(0, 3)
          .map((office) => `
            <li>
              <strong>${escapeHtml(office.office)}</strong>
              <p>${escapeHtml(office.officials.map((official) => official.name).join(", ") || "No official returned")}</p>
            </li>
          `)
          .join("")}
      </ul>
    </div>
  `;
}

async function renderCivicData(plan, formData) {
  if (!plan.googleServicesEnabled) {
    civicDataEl.innerHTML = `
      <p class="muted-text">Google Civic data is hidden because Google services are turned off in the form.</p>
    `;
    return;
  }

  const address = formData.address?.trim();
  const apiKey = appConfig.GOOGLE_CIVIC_API_KEY || "";
  const electionId = appConfig.GOOGLE_CIVIC_ELECTION_ID || "";

  if (!address) {
    civicDataEl.innerHTML = `
      <p class="muted-text">Add an address or ZIP code to unlock location-aware Google Civic lookups and official polling-place context.</p>
    `;
    return;
  }

  if (!apiKey) {
    civicDataEl.innerHTML = `
      <div class="civic-section">
        <h5>Civic API ready for activation</h5>
        <p>BallotBuddy is already wired to the Google Civic Information API. Add a key in <code>config.js</code> to load official election, polling-place, drop-box, and representative data for <strong>${escapeHtml(address)}</strong>.</p>
        <a href="${buildCivicTestUrl("YOUR_API_KEY", electionId)}" target="_blank" rel="noreferrer noopener">View the Civic API test endpoint format</a>
      </div>
    `;
    return;
  }

  const requestId = ++civicRequestId;
  civicDataEl.innerHTML = "<p class=\"muted-text\">Loading official Google Civic information...</p>";

  const [voterInfo, representatives] = await Promise.all([
    fetchVoterInfo(address, apiKey, electionId),
    fetchRepresentatives(address, apiKey)
  ]);

  if (requestId !== civicRequestId) {
    return;
  }

  if (!voterInfo && !representatives) {
    civicDataEl.innerHTML = `
      <p class="muted-text">Google Civic data could not be loaded right now. The assistant still keeps your fallback plan active with Google Search, Maps, Calendar, and workflow shortcuts.</p>
    `;
    return;
  }

  civicDataEl.innerHTML = `
    ${voterInfo?.election ? `
      <div class="civic-section">
        <h5>${escapeHtml(voterInfo.election.name || "Election information")}</h5>
        <p>Election day: ${escapeHtml(voterInfo.election.electionDay || "See official source")}</p>
      </div>
    ` : ""}
    ${renderCivicLocationLinks("Polling locations", voterInfo?.pollingLocations || [])}
    ${renderCivicLocationLinks("Early-voting sites", voterInfo?.earlyVoteSites || [])}
    ${renderCivicLocationLinks("Ballot drop boxes", voterInfo?.dropOffLocations || [])}
    ${renderRepresentativeLinks(representatives)}
  `;
}

function resetChatResult() {
  chatResultEl.innerHTML = "<p>Ask a question and BallotBuddy will explain your plan in plain language.</p>";
}

function respondToQuestion(question) {
  const validatedQuestion = validateQuestion(question);
  const formData = readFormData();
  const plan = buildElectionPlan(formData);
  const answer = answerElectionQuestion(validatedQuestion, plan, formData);

  chatResultEl.innerHTML = `
    <p><strong>Question:</strong> ${escapeHtml(validatedQuestion || "Help me understand my plan")}</p>
    <p><strong>BallotBuddy:</strong> ${escapeHtml(answer)}</p>
  `;

  announceToScreenReader(`Answer: ${answer}`);
}

const persistForm = debounce(() => {
  secureSetItem(STORAGE_KEY, readFormData());
}, 300);

function hydrateSavedForm() {
  const values = secureGetItem(STORAGE_KEY);

  if (!values) {
    return;
  }

  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key);

    if (!field) {
      continue;
    }

    if (field instanceof RadioNodeList) {
      [...field].forEach((input) => {
        if (input.type === "checkbox") {
          input.checked = value === "on";
        } else {
          input.checked = input.value === value;
        }
      });
      continue;
    }

    if (field.type === "checkbox") {
      field.checked = value === "on";
      continue;
    }

    field.value = value;
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  secureSetItem("ballotbuddy-dark-mode", isDark ? "1" : "0");
  showToast(isDark ? "Dark mode enabled" : "Light mode enabled", "info");
}

function initDarkMode() {
  const saved = secureGetItem("ballotbuddy-dark-mode");
  if (saved === "1" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
}

// Event listeners
form.addEventListener("submit", (event) => {
  event.preventDefault();
  void renderPlan(readFormData());
  showToast("Your election plan has been updated!", "success");
});

form.addEventListener("input", () => {
  persistForm();
});

form.addEventListener("change", () => {
  persistForm();
  void renderPlan(readFormData());
});

askButton.addEventListener("click", () => {
  respondToQuestion(questionInput.value);
});

copyCardButton.addEventListener("click", async () => {
  const formData = readFormData();

  if (!hasGeneratedProfile(formData)) {
    showToast("Please enter your name or address first", "error");
    return;
  }

  const plan = buildElectionPlan(formData);

  try {
    await navigator.clipboard.writeText(buildCardText(plan.generatedCard));
    showToast("Card copied to clipboard!", "success");
  } catch (error) {
    showToast("Failed to copy card", "error");
  }
});

printCardButton.addEventListener("click", () => {
  if (!printCardButton.disabled) {
    window.print();
  }
});

quickQuestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.question || "";
    questionInput.value = question;
    respondToQuestion(question);
  });
});

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    respondToQuestion(questionInput.value);
  }
});

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", toggleDarkMode);
}

// Initialize
hydrateSavedForm();
initDarkMode();
void renderPlan(readFormData());


})();
