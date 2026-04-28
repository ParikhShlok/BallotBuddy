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
const calendarLinksEl = document.getElementById("calendarLinks");
const askButton = document.getElementById("ask-button");
const copyCardButton = document.getElementById("copyCardButton");
const printCardButton = document.getElementById("printCardButton");
const questionInput = document.getElementById("question-input");
const chatResultEl = document.getElementById("chat-result");
const toastContainer = document.getElementById("toast-container");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const quickQuestionButtons = document.querySelectorAll("[data-question]");

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

function renderPlan(formData) {
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
  renderCalendarLinks(plan);
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

function renderCalendarLinks(plan) {
  if (!plan.calendarLinks.length) {
    calendarLinksEl.innerHTML = `
      <article>
        <p class="muted-text">Turn on reminder-friendly planning to generate Calendar links for your next milestones.</p>
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
  renderPlan(readFormData());
  showToast("Your election plan has been updated!", "success");
});

form.addEventListener("input", () => {
  persistForm();
});

form.addEventListener("change", () => {
  persistForm();
  renderPlan(readFormData());
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
renderPlan(readFormData());
