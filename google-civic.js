/**
 * Google Civic Information API integration module.
 * Provides graceful fallback when no API key is available.
 * @module google-civic
 */

/**
 * Fetches voter information from Google Civic Information API.
 * @param {string} address - Voter's address.
 * @param {string} [apiKey=""] - Google Civic API key.
 * @returns {Promise<Object|null>} Voter information or null.
 */
export async function fetchVoterInfo(address, apiKey = "") {
  if (!address?.trim() || !apiKey) {
    return null;
  }

  try {
    const url = new URL("https://www.googleapis.com/civicinfo/v2/voterinfo");
    url.searchParams.set("address", address.trim());
    url.searchParams.set("key", apiKey);
    url.searchParams.set("electionId", "2000");

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
export async function fetchRepresentatives(address, apiKey = "") {
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
 * @returns {string} Test URL.
 */
export function buildCivicTestUrl(apiKey) {
  const url = new URL("https://www.googleapis.com/civicinfo/v2/elections");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

