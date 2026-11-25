# Job Circular BD

An offline, bilingual (English / Bangla) job circular tracker for Bangladesh. Save every circular you care about - government, bank, private, NGO or education - with its deadline, fee, exam date and application status, and never miss a closing date again.

No account. No network requests. All data stays in your browser (localStorage).

## Features

- **Dashboard** - total circulars, active count, closing-soon count (<= 7 days), applied count, total fees paid, upcoming exams (next 30 days), plus a "closing soon" list ordered by deadline.
- **Circular register (CRUD)** - organisation, post, sector (Government / Bank / Private / NGO / Education), grade (BCS Cadre, 9th-20th, N/A), vacancies, deadline, application fee (Tk 0-Tk 5,000), fee-paid flag, circular link, exam date + venue, 8-step status pipeline (Saved -> Applied -> Fee paid -> Admit card -> Exam done -> Result out -> Selected / Rejected), and notes.
- **One-tap status advance** - move a circular to the next step; advancing to "Fee paid" marks the fee paid automatically.
- **Search, filter & sort** - text search, sector/status filters, closing-soon-only toggle, sort by deadline / newest / fee.
- **Deadline urgency** - "Closes today", "Closes tomorrow", "N days left" and "Closed" badges; past-deadline cards are dimmed.
- **Validation** - required fields, length limits, vacancy/fee ranges, valid dates, http(s) links only, exam date cannot precede the deadline. Errors are shown inline, per field.
- **Data management** - JSON backup download, strict-validated import (wrong app, version, duplicate id or invalid circular are all rejected with nothing changed), and typed-`DELETE` erase-all.
- **Bilingual UI** - English / Bangla toggle, persisted across reloads, with Bengali digits in Bangla mode. Bengali strings are stored as `\uXXXX` escapes so every source file stays pure ASCII.
- **Privacy & safety** - zero network requests; user-entered text is rendered as text (no HTML injection).

## Tech stack

- Plain HTML + CSS + vanilla JavaScript (no build step, no dependencies)
- `localStorage` persistence (`job-circular-bd-v1`)
- Node.js unit tests (`tests/test.js`) + headless-Chrome smoke tests over CDP (`tests/smoke.mjs`)

## Getting started

```bash
# Just open it - no install, no server needed:
open index.html
# or serve it:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
node tests/test.js            # 65 unit tests (validation, stats, import, pipeline)
node tests/smoke.mjs 1280     # 47 headless-Chrome checks at 1280x800
node tests/smoke.mjs 390      # 47 headless-Chrome checks at 390x844 (mobile)
```

## Deployment

Static site - deploy anywhere that serves static files (GitHub Pages, Netlify, any web server). No environment variables, no secrets, no backend.

## Limitations

- **Ships empty.** The app contains no circular data and fetches none - you enter every circular yourself. Deadlines, fees and exam dates must be verified against the official circular; the app cannot warn you about a circular you never entered.
- Data lives in one browser's localStorage. Use **Data -> Download backup (JSON)** before clearing browser data or switching devices, and import the backup to restore.
- Dates are compared as calendar dates in the device's local timezone; the app does not send reminders or notifications.
- The fee field covers application fees up to Tk 5,000; larger amounts cannot be entered.

## Status

Built 2026-11-25 as factory run #441. Tests: 65/65 unit, 47/47 smoke at 1280x800, 47/47 smoke at 390x844, 0 console errors, 0 network requests.
