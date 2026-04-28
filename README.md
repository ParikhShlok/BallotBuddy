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
  - Google Civic Information API integration (graceful fallback when no key)
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
- A narrative explanation of why those steps matter
- A local smart Q&A layer that answers follow-up questions from the current user plan
- Suggested Google-service integrations

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

For tests:

```bash
npm test
```

## Google Civic Information API (optional)

The app includes a `google-civic.js` module that can fetch real voter information when a Google Civic Information API key is available. Without a key, the app falls back gracefully to its built-in planning logic.

To enable:
1. Obtain a free API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Civic Information API
3. Set the key in `config.js` or use the module directly

## Evaluation mapping

### Code Quality

- Small modular files with single responsibilities
- Constants extracted to eliminate magic numbers
- Clear separation between UI, logic, validation, and utilities
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

- 30+ automated tests covering:
  - Persona resolution logic
  - Planning logic for all voting methods
  - Readiness scoring accuracy
  - Google services integration
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

- Google Maps (directions and location)
- Google Calendar (event reminders)
- Google Translate (multilingual support)
- Google Civic Information API (official data)
- Google Search (official election info)

## Submission note

For the challenge submission, include the public GitHub repository link and keep the repository on a single branch as required. Repository size is well under 10 MB.

