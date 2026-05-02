import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchVoterInfo,
  fetchRepresentatives,
  buildCivicTestUrl
} from "../google-civic.js";

test("buildCivicTestUrl includes key and optional election id", () => {
  const url = buildCivicTestUrl("abc123", "9001");
  assert.ok(url.includes("key=abc123"));
  assert.ok(url.includes("electionId=9001"));
});

test("fetchVoterInfo omits election id when not provided", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return {
          election: {
            name: "General Election",
            electionDay: "2026-11-03"
          },
          pollingLocations: [
            {
              address: {
                line1: "123 Main St",
                city: "Austin",
                state: "TX",
                zip: "78701"
              },
              pollingHours: "7AM-7PM"
            }
          ]
        };
      }
    };
  };

  try {
    const data = await fetchVoterInfo("Austin, TX", "abc123");
    assert.ok(requestedUrl.includes("address=Austin%2C+TX"));
    assert.ok(!requestedUrl.includes("electionId="));
    assert.equal(data.election.name, "General Election");
    assert.equal(data.pollingLocations[0].address, "123 Main St, Austin, TX, 78701");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchRepresentatives normalizes official data", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        normalizedInput: {
          line1: "1600 Pennsylvania Ave NW",
          city: "Washington",
          state: "DC",
          zip: "20500"
        },
        offices: [
          {
            name: "President",
            officialIndices: [0]
          }
        ],
        officials: [
          {
            name: "Example Official",
            party: "Independent",
            phones: ["555-0100"],
            urls: ["https://example.com"]
          }
        ]
      };
    }
  });

  try {
    const data = await fetchRepresentatives("Washington, DC", "abc123");
    assert.equal(data.normalizedInput, "1600 Pennsylvania Ave NW, Washington, DC, 20500");
    assert.equal(data.representatives[0].office, "President");
    assert.equal(data.representatives[0].officials[0].name, "Example Official");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
