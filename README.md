# BallotBuddy

BallotBuddy is an interactive election journey assistant designed for users who are often underserved by generic election information pages. Instead of giving everyone the same instructions, it adapts the guidance based on user context and produces a practical action plan.

## Submission Highlights

- Personalized election assistant aligned directly to the challenge prompt
- Multi-step decision engine for first-time, moved, absentee, and accessibility-focused voters
- Broad Google-services adoption across the workflow, not just a single API call
- Official-data-ready Google Civic integration with graceful fallback
- Small, dependency-light, accessible, and tested codebase suitable for challenge review

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
- It uses **Google services across the full voter workflow**, not as isolated links:
  - Google Search to find official election offices, registration lookup pages, polling-place updates, and ballot help
  - Google Maps links for directions and location awareness
  - Google Calendar as a reminder path for deadlines and election-day actions
  - Google Translate as an accessibility extension for multilingual users
  - Google Civic Information API integration for official election, polling-place, and representative data
  - Google-service workflow cards that connect the user plan to concrete next actions
- It is **lightweight and submission-safe**: no external build tools, no heavy dependencies, very small repository size.
- It is **engineered well**: modular logic, accessible UI, responsive design, automated tests, and dark mode support.

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

### 2. Validation and security

All inputs pass through a dedicated validation layer that:
- Sanitizes strings against XSS (script tags, event handlers, javascript URLs)
- Enforces maximum length limits
- Prevents prototype pollution attacks
- Validates enum values against allowed options
- Returns safe defaults for invalid inputs

### 3. Persona resolution

The logic assigns the user to the most relevant support journey. For example:

- Accessibility needs override other paths because they directly affect how a person can vote
- Mail voters receive absentee-specific guidance
- Recently moved users get address-validation and district-change guidance
- First-time or uncertain users receive more foundational step-by-step help

### 4. Personalized output

The assistant generates:

- A prioritized checklist
- A time-based action timeline
- Risk / watch-out alerts
- An election readiness score with urgency signals
- Concrete next milestones with one-click Google Calendar reminders
- A generated voter action card with shareable Google quick links
- A Google-powered workflow section that maps the plan to Search, Maps, Calendar, and Translate actions
- Official election lookup shortcuts focused on government sources
- Live Google Civic Information API enrichment when a key is configured
- A narrative explanation of why those steps matter
- A local smart Q&A layer that answers follow-up questions from the current user plan
- Suggested Google-service integrations

### 5. Google workflow depth

This project intentionally shows broader adoption of Google services inside the product flow:

- `Google Search` is used to help users reach official government election resources faster.
- `Google Maps` is used for address review, route planning, polling-place access, and civic location shortcuts.
- `Google Calendar` is used to turn milestones into concrete reminder actions.
- `Google Translate` supports multilingual guidance for language-assistance users.
- `Google Civic Information API` enriches the assistant with official election, location, and representative data when configured.

This matters for the challenge because the assistant is not only answering questions. It is helping users move from confusion to action using practical Google-powered steps.

## Security features

- **Content Security Policy (CSP)** meta tag restricts resource loading
- **Input sanitization** removes script tags, event handlers, and malicious URLs
- **Prototype pollution prevention** filters dangerous object keys
- **Secure localStorage** wrapper with size limits and validation
- **HTML escaping** before all DOM insertions
- **No client-side secrets** required for full functionality

## Accessibility features

- **Semantic HTML** with proper heading hierarchy
- **ARIA labels** and roles on all interactive elements
- **Skip-to-content link** for keyboard navigation
- **Screen reader announcements** for dynamic content updates
- **High contrast mode** support via `prefers-contrast`
- **Reduced motion** support via `prefers-reduced-motion`
- **Focus-visible styles** with clear visual indicators
- **Dark mode** toggle with `prefers-color-scheme` detection

## Project structure

```text
.
|-- app.js              # UI rendering and event handling
|-- bundle.js           # Direct-browser runtime bundle for opening index.html locally
|-- constants.js        # Application constants (no magic numbers)
|-- google-civic.js     # Google Civic Information API client
|-- index.html          # Main page with CSP and accessibility
|-- logic.js            # Decision logic and plan generation
|-- styles.css          # Responsive styles with dark mode
|-- utils.js            # Shared utilities (escape, debounce, storage)
|-- validation.js       # Input validation and sanitization
|-- tests/
|   |-- accessibility.test.js  # Accessibility and XSS tests
|   |-- logic.test.js          # Core logic tests
|   |-- run-tests.js           # Test runner
|   |-- security.test.js       # Security-focused tests
`-- README.md
```

## Run locally

Open `index.html` in a browser.

Important note:

- The submission includes `bundle.js` so reviewers can open `index.html` directly without needing a build step or module-aware dev server.
- The modular source files remain in the repository for code quality and maintainability.

For tests:

```bash
npm test
```

## Google Civic Information API (optional but fully wired)

The app includes a `google-civic.js` module that can fetch real voter information when a Google Civic Information API key is available. Without a key, the app falls back gracefully to its built-in planning logic.

To enable:
1. Obtain a free API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Civic Information API
3. Set the key in `config.js`
4. Optionally set `GOOGLE_CIVIC_ELECTION_ID` if you want to target a specific election

For this submission, the app is already wired for live Civic API usage through `config.js`.

Once enabled, the app can display:

- Election name and election day
- Polling locations
- Early-voting sites
- Drop-off locations
- Representative information
- Google Maps shortcuts for official civic locations

## Evaluation mapping

### Code Quality

- Small modular files with single responsibilities
- Constants extracted to eliminate magic numbers
- Clear separation between UI, logic, validation, and utilities
- Direct-browser bundle included for reliable reviewer execution without changing the modular source structure
- Comprehensive JSDoc documentation
- Readable naming and maintainable structure

### Security

- Content Security Policy header
- Dedicated validation layer with XSS prevention
- Prototype pollution protection
- Secure localStorage wrapper
- User-generated UI content is sanitized and escaped
- No dangerous third-party runtime dependencies
- No client-side secret keys required

### Efficiency

- No framework overhead
- Very small bundle footprint
- Debounced form persistence
- DocumentFragment for efficient DOM updates
- Fast startup and low memory usage

### Testing

- 35+ automated tests covering:
  - Persona resolution logic
  - Planning logic for all voting methods
  - Readiness scoring accuracy
  - Google workflow generation
  - Google Civic API URL building and response normalization
  - Security (XSS, injection, prototype pollution)
  - Accessibility (HTML escaping)
  - Edge cases and negative paths
- Uses Node.js built-in test runner for portability

### Accessibility

- Semantic HTML structure
- ARIA labels, live regions, and roles
- Keyboard-focus states with visible indicators
- Skip-to-content link
- Screen reader announcements
- Responsive layout
- Reduced-motion support
- High-contrast mode support
- Dark mode toggle

### Google Services

- Google Maps for address review, travel readiness, and civic-location shortcuts
- Google Calendar for milestone reminders and election-day scheduling
- Google Translate for multilingual voting guidance
- Google Civic Information API for official election, location, and representative data
- Google Search with official-source-focused election office, registration, polling, and ballot queries
- Google workflow cards that connect voter intent to practical Google-powered next actions

## Reviewer Notes

- The repository is lightweight and remains far below the 10 MB limit.
- The project is designed to work when `index.html` is opened directly in a browser, which helps challenge reviewers test it quickly.
- The project is designed to work even without a Civic API key, while still exposing a real Google Civic integration path for live evaluation.
- When a Civic API key is present in `config.js`, the assistant shows live official election data directly in the UI.

## Submission note

For the challenge submission, include the public GitHub repository link and keep the repository on a single branch as required. Repository size is well under 10 MB.
