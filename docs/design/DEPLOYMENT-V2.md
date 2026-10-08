# TicketLens v2 hosted verification

Verified 2026-10-08.

Live demo: https://ticketlens-applicant-demo.vercel.app

## Release checks

The production release is ready, and all 15 publicly served files match the tested static build byte-for-byte and by SHA-256. Native verification: 99 tests passed, zero failures. There are no deployed server functions or application network calls.

Selected source hashes:
- src/app.js: d0eb2b8d1284ffee6ae080651c399fad3457e7c0cfa61985b81620a8e192bfe7
- styles.css: 92932036b813000a2c9b69992c242102bcf8a068163979cc3f99b55434e3ab2d

HTTP 200 and restrictive headers were verified, including CSP connect-src 'none' and frame-ancestors 'none', X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin and HTTPS HSTS. Hosting usage limits still apply; static hosting does not guarantee free or unlimited usage.

## Browser checks actually performed

- Eight cases and three counterfactual cards render; Baseline yields 4/8 cases and 27/40 checks, Guarded yields 8/8 and 40/40 on the curated synthetic fixtures
- All three probes show Baseline FAIL and Guarded PASS, with explicit before/after outputs and absolute-label/relation results
- Approval edits enter unscored exploration, clear scored checks, disable snapshot export and preserve immutable totals; reset restores labeled evaluation
- Keyboard Enter selects a case with retained focus; Tab advances to the next case
- HTML-like narrative remains plain text; invalid affected-user input hides results and disables export
- Imported suites disable built-in simulation and wait for offline candidate output
- The mixed sample reports 7 submitted, 6 valid, denominator 8, with 5/8 cases and 29/40 checks; malformed and missing cases each retain five non-evaluable checks
- Invalid suites and stale candidate digests reject without replacing active data
- Downloaded simulation snapshots replay 8/8 and 40/40 with simulator events; mixed and valid offline snapshots replay their original results with evaluator events only
- Tampering and unsupported versions reject and replace stale successful replay messages
- Accepted deep and high-node malformed outputs retain 7/8 and 35/40 through import, export and replay
- Production was separately checked after release, including actual snapshot export and successful replay

## Responsive check and limits

A valid 64-character case ID initially clipped the detail header at 400 CSS pixels. The corrected version was verified with long identifiers, a 180-character title, 100-character tags/evidence labels and 1,000-character evidence values. Main elements remained within the viewport. Narrow-screen imports, exports, replay, unscored edits and keyboard checks passed.

These checks used desktop cloud Chromium at responsive widths. They do not establish physical-phone or Safari support. The standalone tests/browser.cjs harness was not successfully executed for this release. App-origin console warning/error queries were empty; unrelated extension diagnostics were excluded.

This is an original synthetic, AI-assisted applicant demonstration, not employer work, real-model benchmarking or verified label authorship. Checksums establish consistency, not authenticity.
