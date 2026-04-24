const concernMap = {
  deadlines: "You care most about timing, so the plan prioritizes the next critical cutoff.",
  id_rules: "You flagged document uncertainty, so the checklist highlights identity and verification prep.",
  where_to_vote: "You want location clarity, so the assistant emphasizes polling-place lookup and travel readiness.",
  mail_ballot: "You want a safer absentee path, so the plan focuses on request, return, and tracking steps.",
  confidence: "You want the whole process explained clearly, so the assistant adds more context and confidence-building guidance."
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildElectionPlan(formData) {
  const daysLeft = normalizeNumber(formData.daysUntilElection, 21);
  const name = formData.name?.trim() || "Voter";
  const checklist = [];
  const timeline = [];
  const risks = [];
  const googleSuggestions = [];
  const persona = resolvePersona(formData);
  const electionDate = new Date(Date.now() + daysLeft * DAY_MS);

  checklist.push("Confirm your voter status for your current address so you start from verified information.");
  timeline.push("Today: verify registration, election date, and the voting method you intend to use.");

  if (formData.registrationStatus !== "registered") {
    checklist.unshift("Check registration immediately and complete registration if your state still allows it.");
    risks.push(daysLeft <= 14
      ? "Registration may already be close to the deadline or closed in some regions."
      : "Registration rules vary by state, so leaving this for later could block voting.");
  } else {
    checklist.push("Review your registration record once more to make sure your address and district are correct.");
  }

  if (formData.movedRecently === "yes") {
    checklist.push("Update or confirm your address because moving can change your district, ballot, and polling location.");
    timeline.push(daysLeft <= 10
      ? "Within 24 hours: resolve any address mismatch before you make other voting plans."
      : "This week: confirm whether your move requires a new registration or an address correction.");
    risks.push("A recent move is one of the biggest reasons people show up at the wrong polling place.");
  }

  if (formData.votingMethod === "mail") {
    checklist.push("Request or confirm your mail ballot and set a personal return deadline earlier than the official deadline.");
    checklist.push("Track your ballot status after mailing or dropping it off.");
    timeline.push(daysLeft <= 7
      ? "Right now: if mail timing looks risky, switch to an official drop box or in-person backup plan."
      : "Before the final week: receive, complete, seal, and return your ballot with tracking.");
    risks.push("Mail voting fails most often when voters request or return the ballot too late.");
  }

  if (formData.votingMethod === "early") {
    checklist.push("Look up early-voting dates and choose a lower-stress day before election day crowds build.");
    timeline.push("Before election day: attend early voting with ID and confirmation details if required.");
  }

  if (formData.votingMethod === "in_person") {
    checklist.push("Prepare what you need for election day: ID if required, polling location, and travel time buffer.");
    timeline.push("Election day minus 1 day: double-check polling hours, route, and backup transport.");
  }

  if (formData.accessibilityNeed !== "none") {
    checklist.push("Contact your local election office early to confirm accessible equipment, language help, or curbside options.");
    risks.push("Accessibility support is available in many places, but it works best when arranged before the last minute.");
  }

  if (formData.ageGroup === "18_24") {
    checklist.push("Review first-time voter rules carefully because ID, signature, or residency proof may be different for new voters.");
  }

  if (formData.ageGroup === "65_plus") {
    checklist.push("Choose the least stressful voting path early, especially if transport, queues, or energy levels matter.");
  }

  if (daysLeft <= 14) {
    timeline.push("Within 48 hours: finish every step that could stop you from voting, including registration, address, and ballot requests.");
    risks.push("You are in a late-stage window, so every unresolved item should be treated as urgent.");
  } else if (daysLeft <= 30) {
    timeline.push("Within 7 days: complete all setup tasks so the last week is only for confirmation and voting.");
  } else {
    timeline.push("Over the next 2 weeks: complete setup early and use the final week only for verification.");
  }

  checklist.push("Save the final checklist on your phone so you can act without re-reading the full guide later.");

  googleSuggestions.push(
    {
      title: "Google Civic Information API",
      body: "Look up elections, polling locations, and official voting data from an address when an API key is available."
    },
    {
      title: "Google Maps",
      body: "Generate directions to polling places, early-voting centers, or ballot drop boxes."
    },
    {
      title: "Google Calendar",
      body: "Turn the checklist into reminders for registration, ballot return, and election day travel."
    }
  );

  if (formData.accessibilityNeed === "language") {
    googleSuggestions.push({
      title: "Google Translate",
      body: "Support multilingual guidance for key instructions and official election information."
    });
  }

  const normalizedChecklist = uniqueItems(checklist);
  const normalizedTimeline = uniqueItems(timeline);
  const normalizedRisks = uniqueItems(
    risks.length ? risks : ["No major blockers were detected yet, but you should still verify official local rules and deadlines."]
  );
  const readiness = buildReadinessModel({
    formData,
    daysLeft,
    checklist: normalizedChecklist,
    risks: normalizedRisks
  });
  const milestones = buildMilestones({
    formData,
    daysLeft,
    electionDate,
    checklist: normalizedChecklist
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
  const generatedCard = buildGeneratedCard({
    name,
    formData,
    persona,
    readiness,
    checklist: normalizedChecklist,
    milestones,
    quickLinks
  });

  return {
    name,
    persona,
    summary: `${name}, your assistant identified you as a ${persona.label}. ${persona.description}`,
    checklist: normalizedChecklist,
    timeline: normalizedTimeline,
    risks: normalizedRisks,
    googleSuggestions,
    narrative: buildNarrative({ name, persona, daysLeft, formData }),
    concernInsight: concernMap[formData.mainConcern] || concernMap.confidence,
    readiness,
    milestones,
    calendarLinks,
    quickLinks,
    generatedCard
  };
}

export function resolvePersona(formData) {
  if (formData.accessibilityNeed !== "none") {
    return {
      key: "accessibility",
      label: "voter needing accessible support",
      description: "The plan prioritizes accommodations, support services, and lower-friction voting paths."
    };
  }

  if (formData.votingMethod === "mail") {
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

  if (formData.ageGroup === "18_24" || formData.registrationStatus !== "registered") {
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

export function buildMapsLink(address) {
  if (!address?.trim()) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

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
    return formData.votingMethod === "mail"
      ? "Because you chose mail voting, request or confirm the ballot immediately, return it early, and track it after sending."
      : "You are not currently on the mail-voting path, but you could switch if your local rules allow it and timing still works.";
  }

  if (normalized.includes("where") || normalized.includes("location") || normalized.includes("polling")) {
    return formData.address?.trim()
      ? `Use the Google Maps link in your summary for your area, then verify your official polling place through your local election office.`
      : "Add your address or ZIP code so the assistant can give you a location-aware voting plan and Maps link.";
  }

  if (normalized.includes("id") || normalized.includes("document")) {
    return "Bring any identification your state may require, plus a backup proof-of-address document if you recently moved or are unsure about your registration details.";
  }

  if (normalized.includes("election day") || normalized.includes("prepare") || normalized.includes("voting day")) {
    return formData.votingMethod === "in_person"
      ? "Before election day, confirm polling hours, route, transport backup, and any ID you may need. Save the address on your phone so you can leave without friction."
      : "Even if you are not voting in person, keep a backup plan in case your original method becomes risky close to the deadline.";
  }

  if (normalized.includes("accessibility") || normalized.includes("language") || normalized.includes("help")) {
    return formData.accessibilityNeed !== "none"
      ? "Because you flagged a support need, contact your local election office early to confirm the exact accommodation available at your location."
      : "If you need mobility, vision, or language support, update your form selection and the assistant will adapt your checklist.";
  }

  return `${plan.narrative} Your strongest next move is: ${plan.checklist[0]}`;
}

function buildNarrative({ name, persona, daysLeft, formData }) {
  const urgency = daysLeft <= 7
    ? "This is a high-urgency situation, so the assistant is pushing you toward actions you can complete immediately."
    : daysLeft <= 21
      ? "There is still enough time, but only if you handle the key administrative steps now."
      : "You have useful runway, which means you can build a safer plan instead of reacting at the last minute.";

  const votingPath = formData.votingMethod === "mail"
    ? "Because you prefer voting by mail, the biggest goal is to remove delivery and return risk."
    : formData.votingMethod === "early"
      ? "Because you prefer early voting, the assistant is trying to shift your effort earlier and reduce election day pressure."
      : "Because you prefer voting in person, the assistant is optimizing for preparation, location certainty, and a smooth voting-day experience.";

  return [
    `${name}, you were matched to the ${persona.label} journey.`,
    urgency,
    votingPath,
    concernMap[formData.mainConcern] || concernMap.confidence
  ].join(" ");
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueItems(items) {
  return [...new Set(items)];
}

function buildReadinessModel({ formData, daysLeft, checklist, risks }) {
  let score = 100;
  const blockers = [];

  if (formData.registrationStatus === "not_registered") {
    score -= 32;
    blockers.push("Registration is still unresolved.");
  } else if (formData.registrationStatus !== "registered") {
    score -= 20;
    blockers.push("Registration status still needs verification.");
  }

  if (formData.movedRecently === "yes") {
    score -= 14;
    blockers.push("A recent move can invalidate the address on file.");
  }

  if (formData.votingMethod === "mail") {
    score -= daysLeft <= 7 ? 18 : 10;
    blockers.push("Mail voting depends on faster turnaround and ballot tracking.");
  }

  if (formData.accessibilityNeed !== "none") {
    score -= daysLeft <= 14 ? 14 : 8;
    blockers.push("Accommodation details should be confirmed ahead of time.");
  }

  if (!formData.address?.trim()) {
    score -= 8;
    blockers.push("Location details are missing, so polling logistics are less reliable.");
  }

  if (daysLeft <= 7) {
    score -= 18;
    blockers.push("The election is very close, so delays matter more.");
  } else if (daysLeft <= 14) {
    score -= 12;
  } else if (daysLeft <= 30) {
    score -= 6;
  }

  score = Math.max(18, Math.min(98, score));

  const band = score >= 80
    ? {
        label: "Strong",
        tone: "good",
        description: "You are in good shape, with most risk coming from final confirmation."
      }
    : score >= 60
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

function buildMilestones({ formData, daysLeft, electionDate, checklist }) {
  const items = [];

  items.push({
    title: "Verify voter record",
    timingLabel: daysLeft <= 10 ? "Today" : "Within 48 hours",
    offsetDays: daysLeft <= 10 ? daysLeft : Math.max(daysLeft - 2, 0),
    detail: checklist[0] || "Confirm registration, address, and election details."
  });

  if (formData.registrationStatus !== "registered") {
    items.push({
      title: "Resolve registration status",
      timingLabel: daysLeft <= 14 ? "Within 24 hours" : "This week",
      offsetDays: daysLeft <= 14 ? Math.max(daysLeft - 1, 0) : Math.max(daysLeft - 7, 0),
      detail: "Finish registration or confirm that your current registration is active."
    });
  }

  if (formData.votingMethod === "mail") {
    items.push({
      title: "Return or track ballot",
      timingLabel: daysLeft <= 7 ? "Right now" : "Before the final week",
      offsetDays: daysLeft <= 7 ? daysLeft : 7,
      detail: "Use a safer return path and check tracking rather than waiting until the deadline."
    });
  } else if (formData.votingMethod === "early") {
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

  if (formData.accessibilityNeed !== "none") {
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
    .slice(0, 4)
    .map((item) => ({
      ...item,
      dateLabel: formatRelativeMilestoneDate(electionDate, item.offsetDays)
    }));
}

function buildCalendarLinks({ name, milestones, electionDate }) {
  return milestones.slice(0, 3).map((item, index) => {
    const eventDate = new Date(electionDate.getTime() - item.offsetDays * DAY_MS);
    eventDate.setHours(9 + index, 0, 0, 0);

    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
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

function buildGoogleQuickLinks({ address, mainConcern, accessibilityNeed, electionDate, name }) {
  const trimmedAddress = address?.trim();
  const formattedElectionDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(electionDate);
  const officialSearchQuery = trimmedAddress
    ? `${trimmedAddress} official election office polling place`
    : `official election office polling place voter guide`;
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
      startDate: createDateAtHour(electionDate, 8),
      endDate: createDateAtHour(electionDate, 9)
    })
  });

  if (accessibilityNeed === "language") {
    quickLinks.push({
      title: "Translate key voting instructions",
      body: "Open Google Translate to help review official voting instructions in another language.",
      href: `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent("I need official voting instructions and ballot guidance.")}&op=translate`
    });
  }

  if (mainConcern === "where_to_vote") {
    quickLinks.push({
      title: "Search polling place updates",
      body: "Use Google Search to confirm any location or hours changes close to election day.",
      href: `https://www.google.com/search?q=${encodeURIComponent("polling place hours election day official")}`
    });
  }

  return quickLinks.slice(0, 4);
}

function buildGoogleCalendarLink({ title, details, startDate, endDate }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    dates: `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildGeneratedCard({ name, formData, persona, readiness, checklist, milestones, quickLinks }) {
  return {
    title: `${name}'s BallotBuddy card`,
    voterLabel: name,
    personaLabel: persona.label,
    readinessLabel: `${readiness.score}/100`,
    readinessTone: readiness.band.label,
    votingMethod: formatVotingMethod(formData.votingMethod),
    priorityLine: checklist[0] || "Review your plan and confirm the next required step.",
    topActions: checklist.slice(0, 3),
    milestoneLine: milestones[0]
      ? `${milestones[0].title} - ${milestones[0].timingLabel}`
      : "No milestone generated yet.",
    quickLinks: quickLinks.slice(0, 3)
  };
}

function formatCalendarDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function formatRelativeMilestoneDate(electionDate, offsetDays) {
  const date = new Date(electionDate.getTime() - offsetDays * DAY_MS);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function createDateAtHour(date, hour) {
  const nextDate = new Date(date);
  nextDate.setHours(hour, 0, 0, 0);
  return nextDate;
}

function formatVotingMethod(method) {
  if (method === "mail") {
    return "Mail / absentee";
  }

  if (method === "early") {
    return "Early voting";
  }

  return "In person";
}
