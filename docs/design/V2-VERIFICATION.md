# TicketLens v2 verification

Verified 2026-10-08.

- 99 native Node tests pass, with no runtime dependencies
- Build produces 15 allowlisted static files
- Native coverage includes strict contracts, suite digest binding, fixed denominators, missing and malformed outputs, finite JSON, bounded parsing, counterfactual relations, canonical snapshots, tampering rejection, full replay recomputation and stale asynchronous UI operations
- Four downloadable-example tests verify hashes, replay and invalid/missing/valid-but-wrong output states
- DOM-double tests verify application state behavior; they do not establish browser rendering
- Hosted cloud-Chromium checks passed for imports, unscored edits, probes, snapshot download/replay, rejection paths, keyboard interaction and 400px responsive bounds
- One narrow-header clipping issue was found, corrected and verified before release
- All 15 publicly served files matched the tested build

See [hosted verification](DEPLOYMENT-V2.md) for the browser checks and limits. The optional standalone Playwright harness in tests/browser.cjs was not successfully executed for this release. No physical-phone or Safari coverage is claimed.
