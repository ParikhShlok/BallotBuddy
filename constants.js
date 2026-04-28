/**
 * Application constants to eliminate magic numbers and centralize configuration.
 * @module constants
 */

/** Number of milliseconds in one day. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Maximum allowed days until election. */
export const MAX_DAYS_UNTIL_ELECTION = 365;

/** Default days until election fallback. */
export const DEFAULT_DAYS_UNTIL_ELECTION = 21;

/** Maximum input string length for name field. */
export const MAX_NAME_LENGTH = 40;

/** Maximum input string length for address field. */
export const MAX_ADDRESS_LENGTH = 120;

/** Score thresholds for readiness bands. */
export const READINESS_THRESHOLDS = {
  STRONG: 80,
  NEEDS_ATTENTION: 60,
  MINIMUM: 18
};

/** Score penalties for various risk factors. */
export const READINESS_PENALTIES = {
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
export const URGENCY_THRESHOLDS = {
  VERY_CLOSE: 7,
  CLOSE: 14,
  MODERATE: 30
};

/** Maximum milestones to display. */
export const MAX_MILESTONES = 4;

/** Maximum calendar links to generate. */
export const MAX_CALENDAR_LINKS = 3;

/** Maximum quick links to display. */
export const MAX_QUICK_LINKS = 4;

/** Maximum top actions in generated card. */
export const MAX_TOP_ACTIONS = 3;

/** Google Calendar event duration in milliseconds (1 hour). */
export const CALENDAR_EVENT_DURATION_MS = 60 * 60 * 1000;

/** Default hour for calendar reminder events. */
export const CALENDAR_DEFAULT_START_HOUR = 9;

/** Default hour for election day calendar event. */
export const ELECTION_DAY_START_HOUR = 8;

/** Default duration for election day event in hours. */
export const ELECTION_DAY_DURATION_HOURS = 1;

/** localStorage key for form draft. */
export const STORAGE_KEY = "ballotbuddy-form-draft";

/** CSP nonce placeholder (updated at build time if needed). */
export const CSP_NONCE = "";

/** Allowed voting methods. */
export const VOTING_METHODS = Object.freeze({
  MAIL: "mail",
  EARLY: "early",
  IN_PERSON: "in_person"
});

/** Allowed registration statuses. */
export const REGISTRATION_STATUSES = Object.freeze({
  REGISTERED: "registered",
  NOT_REGISTERED: "not_registered",
  UNKNOWN: "unknown"
});

/** Allowed accessibility needs. */
export const ACCESSIBILITY_NEEDS = Object.freeze({
  NONE: "none",
  MOBILITY: "mobility",
  VISION: "vision",
  LANGUAGE: "language"
});

/** Allowed age groups. */
export const AGE_GROUPS = Object.freeze({
  YOUNG: "18_24",
  ADULT: "25_44",
  MIDDLE: "45_64",
  SENIOR: "65_plus"
});

/** Allowed main concerns. */
export const MAIN_CONCERNS = Object.freeze({
  DEADLINES: "deadlines",
  ID_RULES: "id_rules",
  WHERE_TO_VOTE: "where_to_vote",
  MAIL_BALLOT: "mail_ballot",
  CONFIDENCE: "confidence"
});

