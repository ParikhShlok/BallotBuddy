import assert from "node:assert/strict";

import { buildElectionPlan, buildMapsLink, resolvePersona } from "../logic.js";

const tests = [
  {
    name: "resolvePersona prioritizes accessibility needs",
    run() {
      const persona = resolvePersona({
        accessibilityNeed: "mobility",
        votingMethod: "mail",
        movedRecently: "yes",
        ageGroup: "18_24",
        registrationStatus: "unknown"
      });

      assert.equal(persona.key, "accessibility");
    }
  },
  {
    name: "mail voters get ballot return guidance",
    run() {
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
    }
  },
  {
    name: "moved voters receive address risk warning",
    run() {
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
    }
  },
  {
    name: "maps links encode addresses",
    run() {
      assert.equal(
        buildMapsLink("Mountain View, CA"),
        "https://www.google.com/maps/search/?api=1&query=Mountain%20View%2C%20CA"
      );
    }
  },
  {
    name: "plans include readiness scoring",
    run() {
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
    }
  },
  {
    name: "reminder-friendly plans generate calendar links",
    run() {
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
    }
  },
  {
    name: "generated voter card includes personalized summary fields",
    run() {
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
    }
  },
  {
    name: "google quick links include maps when address is present",
    run() {
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
    }
  }
];

let passed = 0;

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS ${test.name}`);
  } catch (error) {
    console.error(`FAIL ${test.name}`);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`All ${passed} tests passed.`);
}
