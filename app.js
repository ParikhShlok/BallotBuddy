import { answerElectionQuestion, buildElectionPlan, buildMapsLink } from "./logic.js";

const form = document.getElementById("assistant-form");
const summaryEl = document.getElementById("summary");
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
const quickQuestionButtons = [...document.querySelectorAll("[data-question]")];
const chatResultEl = document.getElementById("chat-result");
const STORAGE_KEY = "ballotbuddy-form-draft";

hydrateSavedForm();

renderPlan(readFormData());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderPlan(readFormData());
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
    return;
  }

  const plan = buildElectionPlan(formData);

  try {
    await navigator.clipboard.writeText(buildCardText(plan.generatedCard));
    copyCardButton.textContent = "Copied";
  } catch (error) {
    copyCardButton.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    copyCardButton.textContent = "Copy card text";
  }, 1800);
});

printCardButton.addEventListener("click", () => {
  if (!printCardButton.disabled) {
    window.print();
  }
});

function renderPlan(formData) {
  const plan = buildElectionPlan(formData);
  const mapsLink = buildMapsLink(formData.address);
  const shouldShowCard = hasGeneratedProfile(formData);

  summaryEl.innerHTML = `
    <p><strong>${escapeHtml(plan.summary)}</strong></p>
    <p>${escapeHtml(plan.concernInsight)}</p>
    ${mapsLink ? `<p><a href="${mapsLink}" target="_blank" rel="noreferrer">Open this address in Google Maps</a></p>` : ""}
  `;
  generatedCardEl.innerHTML = shouldShowCard
    ? `
      <div class="generated-card-header">
        <div>
          <p class="generated-card-kicker">Personal voter snapshot</p>
          <h4>${escapeHtml(plan.generatedCard.title)}</h4>
        </div>
        <span class="card-badge card-${escapeHtml(plan.readiness.band.tone)}">${escapeHtml(plan.generatedCard.readinessTone)}</span>
      </div>
      <div class="generated-card-grid">
        <div>
          <p class="card-label">Voter</p>
          <p class="card-value">${escapeHtml(plan.generatedCard.voterLabel)}</p>
        </div>
        <div>
          <p class="card-label">Journey</p>
          <p class="card-value">${escapeHtml(plan.generatedCard.personaLabel)}</p>
        </div>
        <div>
          <p class="card-label">Voting method</p>
          <p class="card-value">${escapeHtml(plan.generatedCard.votingMethod)}</p>
        </div>
        <div>
          <p class="card-label">Readiness</p>
          <p class="card-value">${escapeHtml(plan.generatedCard.readinessLabel)}</p>
        </div>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Priority action</p>
        <p>${escapeHtml(plan.generatedCard.priorityLine)}</p>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Next milestone</p>
        <p>${escapeHtml(plan.generatedCard.milestoneLine)}</p>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Top actions</p>
        <ul class="card-list">
          ${plan.generatedCard.topActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      <div class="generated-card-block">
        <p class="card-label">Google quick actions</p>
        <div class="generated-links">
          ${plan.generatedCard.quickLinks
            .map((item) => `<a href="${item.href}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`)
            .join("")}
        </div>
      </div>
    `
    : `
      <div class="generated-card-empty">
        <h4>Your voter card will appear here</h4>
        <p>Add at least your name or location and BallotBuddy will generate a smart action card with Google shortcuts.</p>
      </div>
    `;
  copyCardButton.disabled = !shouldShowCard;
  printCardButton.disabled = !shouldShowCard;
  readinessScoreEl.innerHTML = `
    <div class="score-ring score-${escapeHtml(plan.readiness.band.tone)}" style="--score-angle:${escapeHtml(Math.round(plan.readiness.score * 3.6))}deg;">
      <span class="score-value">${escapeHtml(plan.readiness.score)}</span>
      <span class="score-total">/100</span>
    </div>
    <p class="score-label">${escapeHtml(plan.readiness.band.label)}</p>
    <p class="muted-text">${escapeHtml(plan.readiness.summary)}</p>
    <p class="muted-text">Active risks detected: ${escapeHtml(plan.readiness.riskCount)}</p>
  `;
  milestonesEl.innerHTML = plan.milestones
    .map((item) => `
      <li>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.timingLabel)} | ${escapeHtml(item.dateLabel)}</p>
        <p>${escapeHtml(item.detail)}</p>
      </li>
    `)
    .join("");

  checklistEl.innerHTML = plan.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  timelineEl.innerHTML = plan.timeline.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  risksEl.innerHTML = plan.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  narrativeEl.innerHTML = `<p>${escapeHtml(plan.narrative)}</p>`;
  googleSuggestionsEl.innerHTML = plan.googleSuggestions
    .map((item) => `
      <article>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.body)}</p>
      </article>
    `)
    .join("");
  calendarLinksEl.innerHTML = plan.calendarLinks.length
    ? plan.calendarLinks
      .map((item) => `
        <article>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.label)}</p>
          <a href="${item.href}" target="_blank" rel="noreferrer">Add to Google Calendar</a>
        </article>
      `)
      .join("")
    : `<article><p class="muted-text">Turn on reminder-friendly planning to generate Calendar links for your next milestones.</p></article>`;
  chatResultEl.innerHTML = "<p>Ask a question and BallotBuddy will explain your plan in plain language.</p>";
}

function readFormData() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function respondToQuestion(question) {
  const formData = readFormData();
  const plan = buildElectionPlan(formData);
  const answer = answerElectionQuestion(question, plan, formData);
  chatResultEl.innerHTML = `
    <p><strong>Question:</strong> ${escapeHtml(question || "Help me understand my plan")}</p>
    <p><strong>BallotBuddy:</strong> ${escapeHtml(answer)}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function persistForm() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormData()));
}

function hydrateSavedForm() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const values = JSON.parse(saved);

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
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function hasGeneratedProfile(formData) {
  return Boolean(formData.name?.trim() || formData.address?.trim());
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
