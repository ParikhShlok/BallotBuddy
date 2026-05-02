/**
 * BallotBuddy election planning logic module.
 * Contains all decision-making, scoring, and plan generation logic.
 * @module logic
 */

import {
  DAY_MS,
  DEFAULT_DAYS_UNTIL_ELECTION,
  MAX_DAYS_UNTIL_ELECTION,
  READINESS_THRESHOLDS,
  READINESS_PENALTIES,
  URGENCY_THRESHOLDS,
  MAX_MILESTONES,
  MAX_CALENDAR_LINKS,
  MAX_QUICK_LINKS,
  MAX_TOP_ACTIONS,
  CALENDAR_EVENT_DURATION_MS,
  CALENDAR_DEFAULT_START_HOUR,
  ELECTION_DAY_START_HOUR,
  ELECTION_DAY_DURATION_HOURS,
  VOTING_METHODS,
  REGISTRATION_STATUSES,
  ACCESSIBILITY_NEEDS,
  AGE_GROUPS,
  MAIN_CONCERNS
} from "./constants.js";

import { validateFormData } from "./validation.js";

import {
  uniqueItems,
  formatCalendarDate,
  formatRelativeMilestoneDate,
  createDateAtHour,
  formatVotingMethod
} from "./utils.js";

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
export function buildElectionPlan(rawFormData) {
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
export function resolvePersona(formData) {
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
export function buildMapsLink(address) {
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
export function answerElectionQuestion(question, plan, formData) {
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
