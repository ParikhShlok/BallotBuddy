# BallotBuddy

BallotBuddy is an interactive election journey assistant designed for users who are often underserved by generic election information pages. Instead of giving everyone the same instructions, it adapts the guidance based on user context and produces a practical action plan.

This project is built for the challenge problem:

> Create an assistant that helps users understand the election process, timelines, and steps in an interactive and easy-to-follow way.

## Chosen Vertical

This solution targets a **civic guidance / voter support** vertical with four high-value personas:

- First-time or uncertain voters
- Recently moved voters
- Mail / absentee voters
- Voters needing accessibility or language support

These personas were chosen because they commonly face confusion, deadline risk, and logistics problems even when election information is technically available online.

## Why this project stands out

- It is **interactive**, not static: the user answers a few contextual questions and receives a tailored journey.
- It is **decision-driven**: logic changes based on registration certainty, move status, voting method, urgency, age band, and accessibility needs.
- It uses **Google services meaningfully** without blocking reviewers behind paid setup:
  - Google Maps links for directions and location awareness
  - Google Calendar as a reminder path for deadlines and election-day actions
  - Google Translate as an accessibility extension for multilingual users
- It is **lightweight and submission-safe**: no external build tools, no heavy dependencies, very small repository size.
- It is **engineered well**: modular logic, accessible UI, responsive design, and automated tests.

## How the solution works

### 1. User intake

The assistant asks for:

- Name
- Address or ZIP code
- Days left until the election
- Registration status
- Whether the user moved recently
- Voting method
- Accessibility needs
- Age band
- Biggest concern

### 2. Persona resolution

The logic assigns the user to the most relevant support journey. For example:

- Accessibility needs override other paths because they directly affect how a person can vote
- Mail voters receive absentee-specific guidance
- Recently moved users get address-validation and district-change guidance
- First-time or uncertain users receive more foundational step-by-step help

### 3. Personalized output

The assistant generates:

- A prioritized checklist
- A time-based action timeline
- Risk / watch-out alerts
- An election readiness score with urgency signals
- Concrete next milestones with one-click Google Calendar reminders
- A generated voter action card with shareable Google quick links
- A narrative explanation of why those steps matter
- A local smart Q&A layer that answers follow-up questions from the current user plan
- Suggested Google-service integrations

## Assumptions made

- Election deadlines vary across jurisdictions, so the assistant focuses on adaptable planning logic instead of hardcoding fragile jurisdiction data.
- The challenge reviewers may run the project locally without API keys, so the app is intentionally fully usable with zero external API setup.
- Users benefit more from a clear action plan than from dense legal explanations.
- A front-end-only solution is the safest way to keep the repository small, easy to inspect, and easy to run.

## Project structure

```text
.
|-- app.js
|-- index.html
|-- logic.js
|-- styles.css
|-- tests/
|   |-- logic.test.js
|   `-- run-tests.js
`-- README.md
```

## Run locally

Open `index.html` in a browser.

For tests:

```bash
npm test
```

## Evaluation mapping

### Code Quality

- Small modular files
- Clear separation between UI and decision logic
- Readable naming and maintainable structure

### Security

- No dangerous third-party runtime dependencies
- User-generated UI content is HTML-escaped before rendering
- No client-side secret keys are required

### Efficiency

- No framework overhead
- Very small bundle footprint
- Fast startup and low memory usage

### Testing

- Includes automated tests for persona resolution, planning logic, and mapping links
- Uses a lightweight Node assertion runner to stay portable in restricted environments

### Accessibility

- Semantic HTML
- Keyboard-focus states
- Responsive layout
- Reduced-motion support

### Google Services

- Google Maps
- Google Calendar workflow potential
- Google Translate workflow potential

## Submission note

For the challenge submission, include the public GitHub repository link and keep the repository on a single branch as required.
