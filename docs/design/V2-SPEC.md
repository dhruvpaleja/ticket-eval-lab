# TicketLens v2 design

TicketLens is a browser-only evaluation workbench for independently supplied synthetic labels and offline candidate outputs. It is an AI-assisted applicant demo, with no live model calls or company affiliation.

## Contracts

Suite labels specify route, priority, approval gate, evidence IDs and allowed actions. Candidate bundles bind to the exact suite SHA-256 digest. Invalid envelopes, duplicate IDs, unknown case IDs, oversized inputs and digest mismatches reject atomically. Missing or malformed decisions remain in the fixed denominator, receive zero credit and are reported as non-evaluable. Output coverage is separate from scoring. Edited drafts are unscored exploration.

## Counterfactual probes

Three authored pairs isolate missing versus recorded approval, outage impact at 19 versus 20 users, and hostile narrative added to unchanged structured hardware facts. Passing requires both absolute labels and the declared relation. These are constructed regression probes, not real-model benchmarks or causal conclusions.

## Replay

Canonical snapshots contain raw suite and candidate data, pinned versions, complete check results, evaluator events and SHA-256 checksums. Replay validates contracts and recomputes the full result. Built-in simulations additionally reproduce decisions and structured rule events; offline candidates never receive invented reasoning. Checksums establish internal consistency, not authenticity.

## Safety boundaries

Inputs must declare synthetic data. The application cannot verify that declaration or the authorship of labels. Imported JSON is bounded and rendered as text. There are no application network calls, accounts, secrets, durable storage or production IT actions. The simulators run only on their exact curated built-in fixtures; imported suites require offline outputs.

See the README for format limits, security limitations, scoring rules and the programmatic API.
