# TEST RESULTS - job-circular-bd (factory run #441, 2026-11-25)

## Unit tests (Node, `node tests/test.js`)
- **65 passed, 0 failed.**
- Coverage: date validation (incl. 2026-02-30 rejected), daysLeft math, all validation
  rules (required / too-long / sector / grade / vacancies 1-99999 / fee 0-5000 /
  bad URL / ftp rejected / exam-before-deadline), stats (total 4, active 3,
  closingSoon 2, applied 2, feesPaid 700, exams 1), closingSoon ordering,
  filters (sector/status/search/closingSoon), sort (fee, deadline), full
  NEXT_STATUS pipeline, strict import (bad JSON, wrong app, wrong version,
  duplicate id, invalid circular, missing id all rejected; empty list ok),
  normalize (trimming, feePaid coercion).

## Headless-Chrome smoke tests (raw CDP, headless_shell-1187, file://)
- **1280x800: 47 passed, 0 failed.** `tests/smoke-1280.png`
- **390x844: 47 passed, 0 failed.** `tests/smoke-390.png`
- Hand-verified flows: empty submit shows 5 field errors and adds nothing;
  bad URL + exam-before-deadline rejected; CAG Junior Auditor (govt, 14-16th
  grade, 70 vacancies, deadline 2026-11-30, fee 112 paid, status Applied) and
  Bangladesh Bank Assistant Director (bank, 9th grade, 100 vacancies, deadline
  2026-12-20, fee 500 unpaid, exam 2027-01-10) saved; dashboard totals correct
  (total 2, fees paid Tk 112, closing soon 1 = Junior Auditor); search "bangladesh
  bank" -> 1 card; sector govt -> 1; closing-soon filter -> 1; sort by fee ->
  Assistant Director first; advance moves Bangladesh Bank Saved -> Applied;
  edit raises CAG fee 112 -> 200 and dashboard fees paid becomes Tk 200; delete
  (confirm) leaves 1 circular; good import replaces with 2, bad import keeps 2;
  XSS org `<img src=x onerror=alert(1)>` renders as inert text (0 img elements);
  erase with "delete" keeps data, "DELETE" erases all; Bangla toggle shows
  "Chakrir Biggopti BD" + Bengali digits (Tk 500 (Bengali digits)) and persists across reload
  with data intact.
- 0 console errors, 0 failed requests, 0 network requests, no horizontal
  overflow at either width. Screenshots visually verified.

## Repairs
- 0 app bugs. 2 test-harness bugs: the ASCII conversion of tests/smoke.mjs
  hand-built two Bengali check strings with wrong escapes (a missing space, a
  missing letter, an extra vowel sign); both were regenerated from the real
  Bengali text and re-verified (47/47 at both widths after the fix).
- 1 tooling incident: the ASCII-conversion script truncated js/app.js to 0
  bytes (opened for write, then failed on a leftover non-ASCII char). The file
  was rewritten from scratch with \u escapes, syntax-checked, and all tests
  re-run green.
