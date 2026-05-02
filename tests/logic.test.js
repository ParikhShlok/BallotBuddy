import test from "node:test";
import assert from "node:assert/strict";

import { buildElectionPlan, buildMapsLink, resolvePersona } from "../logic.js";
import { validateFormData } from "../validation.js";

test("resolvePersona prioritizes accessibility needs", () => {
  const persona = resolvePersona({
    accessibilityNeed: "mobility",
    votingMethod: "mail",
    movedRecently: "yes",
    ageGroup: "18_24",
    registrationStatus: "unknown"
  });
  assert.equal(persona.key, "accessibility");
});

test("resolvePersona identifies mail voters", () => {
  const persona = resolvePersona({
    accessibilityNeed: "none",
    votingMethod: "mail",
    movedRecently: "no",
    ageGroup: "25_44",
    registrationStatus: "registered"
  });
  assert.equal(persona.key, "absentee");
});

test("resolvePersona identifies moved voters", () => {
  const persona = resolvePersona({
    accessibilityNeed: "none",
    votingMethod: "in_person",
    movedRecently: "yes",
    ageGroup: "25_44",
    registrationStatus: "registered"
  });
  assert.equal(persona.key, "moved");
});

test("resolvePersona identifies first-time voters by age", () => {
  const persona = resolvePersona({
    accessibilityNeed: "none",
    votingMethod: "in_person",
    movedRecently: "no",
    ageGroup: "18_24",
    registrationStatus: "registered"
  });
  assert.equal(persona.key, "first_time");
});

test("resolvePersona identifies first-time voters by registration", () => {
  const persona = resolvePersona({
    accessibilityNeed: "none",
    votingMethod: "in_person",
    movedRecently: "no",
    ageGroup: "25_44",
    registrationStatus: "not_registered"
  });
  assert.equal(persona.key, "first_time");
});

test("resolvePersona defaults to general voter", () => {
  const persona = resolvePersona({
    accessibilityNeed: "none",
    votingMethod: "in_person",
    movedRecently: "no",
    ageGroup: "25_44",
    registrationStatus: "registered"
  });
  assert.equal(persona.key, "general");
});

test("mail voters get ballot return guidance", () => {
  const plan = buildElectionPlan({
    name: "Sam",
    daysUntilElection: 5,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "mail",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "mail_ballot"
  });
  assert.ok(plan.checklist.some((item) => item.includes("mail ballot") || item.includes("ballot")));
  assert.ok(plan.risks.some((item) => item.includes("Mail voting")));
});

test("moved voters receive address risk warning", () => {
  const plan = buildElectionPlan({
    name: "Riya",
    daysUntilElection: 12,
    registrationStatus: "registered",
    movedRecently: "yes",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "where_to_vote"
  });
  assert.ok(plan.risks.some((item) => item.includes("wrong polling place")));
});

test("maps links encode addresses", () => {
  assert.equal(
    buildMapsLink("Mountain View, CA"),
    "https://www.google.com/maps/search/?api=1&query=Mountain%20View%2C%20CA"
  );
});

test("maps links handle empty addresses", () => {
  assert.equal(buildMapsLink(""), "");
  assert.equal(buildMapsLink(null), "");
  assert.equal(buildMapsLink("   "), "");
});

test("plans include readiness scoring", () => {
  const plan = buildElectionPlan({
    name: "Jordan",
    address: "Austin, TX",
    daysUntilElection: 25,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "early",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence",
    wantsReminders: "on"
  });
  assert.ok(plan.readiness.score >= 60);
  assert.equal(typeof plan.readiness.band.label, "string");
  assert.ok(plan.milestones.length >= 2);
});

test("readiness score decreases for unregistered voters", () => {
  const unregistered = buildElectionPlan({
    name: "Test",
    daysUntilElection: 30,
    registrationStatus: "not_registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });

  const registered = buildElectionPlan({
    name: "Test",
    daysUntilElection: 30,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });

  assert.ok(unregistered.readiness.score < registered.readiness.score);
});

test("readiness score decreases when election is very close", () => {
  const close = buildElectionPlan({
    name: "Test",
    daysUntilElection: 3,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });

  const far = buildElectionPlan({
    name: "Test",
    daysUntilElection: 60,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });

  assert.ok(close.readiness.score < far.readiness.score);
});

test("reminder-friendly plans generate calendar links", () => {
  const plan = buildElectionPlan({
    name: "Casey",
    address: "Chicago, IL",
    daysUntilElection: 6,
    registrationStatus: "unknown",
    movedRecently: "yes",
    votingMethod: "mail",
    accessibilityNeed: "language",
    ageGroup: "18_24",
    mainConcern: "deadlines",
    wantsReminders: "on"
  });
  assert.ok(plan.calendarLinks.length >= 1);
  assert.ok(plan.calendarLinks[0].href.startsWith("https://calendar.google.com/calendar/render?"));
});

test("non-reminder plans do not generate calendar links", () => {
  const plan = buildElectionPlan({
    name: "Casey",
    daysUntilElection: 6,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence",
    wantsReminders: "off"
  });
  assert.equal(plan.calendarLinks.length, 0);
});

test("generated voter card includes personalized summary fields", () => {
  const plan = buildElectionPlan({
    name: "Nina",
    address: "Seattle, WA",
    daysUntilElection: 9,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "where_to_vote",
    wantsReminders: "on"
  });
  assert.equal(plan.generatedCard.voterLabel, "Nina");
  assert.equal(plan.generatedCard.votingMethod, "In person");
  assert.ok(plan.generatedCard.topActions.length >= 1);
});

test("google quick links include maps when address is present", () => {
  const plan = buildElectionPlan({
    name: "Leo",
    address: "Boston, MA",
    daysUntilElection: 18,
    registrationStatus: "unknown",
    movedRecently: "yes",
    votingMethod: "early",
    accessibilityNeed: "language",
    ageGroup: "18_24",
    mainConcern: "where_to_vote",
    wantsReminders: "on"
  });
  assert.ok(plan.quickLinks.some((item) => item.title.includes("Maps")));
  assert.ok(plan.quickLinks.some((item) => item.href.includes("google.com")));
});

test("accessibility needs add language support link", () => {
  const plan = buildElectionPlan({
    name: "Test",
    daysUntilElection: 20,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "language",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });
  assert.ok(plan.googleSuggestions.some((item) => item.title.includes("Translate")));
  assert.ok(plan.quickLinks.some((item) => item.title.includes("Translate")));
});

test("google workflow is generated when services are enabled", () => {
  const plan = buildElectionPlan({
    name: "Maya",
    address: "Denver, CO",
    daysUntilElection: 14,
    registrationStatus: "unknown",
    movedRecently: "yes",
    votingMethod: "early",
    accessibilityNeed: "language",
    ageGroup: "18_24",
    mainConcern: "where_to_vote",
    wantsReminders: "on",
    showGoogleServices: "on"
  });

  assert.ok(plan.googleWorkflow.length >= 3);
  assert.ok(plan.officialLookupLinks.length >= 3);
  assert.ok(plan.googleWorkflow.some((item) => item.title.includes("Google")));
  assert.ok(plan.officialLookupLinks.some((item) => item.href.includes("google.com/search")));
});

test("google sections collapse when services are disabled", () => {
  const plan = buildElectionPlan({
    name: "Maya",
    address: "Denver, CO",
    daysUntilElection: 14,
    registrationStatus: "unknown",
    movedRecently: "yes",
    votingMethod: "early",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence",
    wantsReminders: "on",
    showGoogleServices: "off"
  });

  assert.equal(plan.googleServicesEnabled, false);
  assert.equal(plan.googleSuggestions.length, 0);
  assert.equal(plan.googleWorkflow.length, 0);
  assert.equal(plan.officialLookupLinks.length, 0);
});

test("urgent timeline is generated when election is close", () => {
  const plan = buildElectionPlan({
    name: "Test",
    daysUntilElection: 5,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "deadlines"
  });
  assert.ok(plan.timeline.some((item) => item.includes("48 hours")));
  assert.ok(plan.risks.some((item) => item.includes("late-stage")));
});

test("plan handles missing name gracefully", () => {
  const plan = buildElectionPlan({
    daysUntilElection: 21,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });
  assert.equal(plan.name, "Voter");
  assert.ok(plan.generatedCard.title.includes("Voter"));
});

test("plan handles all voting methods", () => {
  for (const method of ["in_person", "mail", "early"]) {
    const plan = buildElectionPlan({
      name: "Test",
      daysUntilElection: 21,
      registrationStatus: "registered",
      movedRecently: "no",
      votingMethod: method,
      accessibilityNeed: "none",
      ageGroup: "25_44",
      mainConcern: "confidence"
    });
    assert.ok(plan.checklist.length > 0, `Method ${method} should generate checklist`);
    assert.ok(plan.timeline.length > 0, `Method ${method} should generate timeline`);
  }
});

test("plan validates and sanitizes malicious inputs", () => {
  const plan = buildElectionPlan({
    name: "<script>alert(1)</script>Eve",
    address: "javascript:alert(1)",
    daysUntilElection: 21,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence"
  });
  assert.ok(!plan.name.includes("<script>"));
  assert.ok(!plan.summary.includes("<script>"));
});

test("milestones include dates when reminders enabled", () => {
  const plan = buildElectionPlan({
    name: "Test",
    daysUntilElection: 30,
    registrationStatus: "registered",
    movedRecently: "no",
    votingMethod: "in_person",
    accessibilityNeed: "none",
    ageGroup: "25_44",
    mainConcern: "confidence",
    wantsReminders: "on"
  });

  for (const milestone of plan.milestones) {
    assert.ok(milestone.dateLabel, "Milestone should have a date label");
    assert.ok(milestone.title, "Milestone should have a title");
    assert.ok(typeof milestone.offsetDays === "number", "Milestone should have offsetDays");
  }
});
