/**
 * BallotBuddy application module.
 * Handles UI rendering, user interactions, and DOM updates.
 * @module app
 */

import {
  answerElectionQuestion,
  buildElectionPlan,
  buildMapsLink
} from "./logic.js";
import {
  fetchVoterInfo,
  fetchRepresentatives,
  buildCivicTestUrl
} from "./google-civic.js";

import { validateQuestion } from "./validation.js";

import {
  escapeHtml,
  debounce,
  secureSetItem,
  secureGetItem,
  announceToScreenReader
} from "./utils.js";

import { STORAGE_KEY } from "./constants.js";

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
