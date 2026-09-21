# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a security administrator reviewing suspicious email activity, origin data, and preserved forensic records. Authenticated analysts are also supported as operational users.

## Product Purpose

ThreatLens detects email threats, traces the apparent sending origin from message headers, and preserves an auditable cryptographic log of the investigation. Success means an administrator can understand what happened, where the message appears to have come from, and whether the recorded evidence remains intact.

## Positioning

ThreatLens combines email threat detection, origin geolocation, and cryptographic forensic logging in one investigation workflow. Its distinctive mechanism is the connection between header-derived origin tracing and a tamper-evident Evidence Vault record.

## Operating Context

Users upload or inspect email records, review threat findings and origin hops, examine related cases, and export or authenticate forensic evidence. The application supports guest analysis as well as authenticated analyst and administrator sessions.

## Capabilities and Constraints

- Detects suspicious email characteristics and assigns a threat score.
- Reconstructs received-header hops and estimates the apparent sending location.
- Maintains a cryptographic log of forensic actions.
- Guests must not see external hop locations, origin IP details, or other location-bearing routing data.
- Guests must not perform cryptographic verification of the Evidence Vault log.
- Authenticated users may access protected forensic verification according to their role.
- The welcome page is shown to guests on reload; authenticated users remain in the workspace after reload.

## Brand Commitments

- Product name: ThreatLens.
- Tagline: “Tracing every threat back to its source.”
- Existing dark ThreatLens workspace theme should remain coherent across entry and investigation surfaces.

## Evidence on Hand

- Sample email fixtures: `samples/sample_legit.eml`, `samples/sample_phishing_lookalike.eml`, and `samples/sample_phishing_spoofed.eml`.
- Existing investigation UI and Evidence Vault implementation in `frontend/src/` and `backend/app/`.
- Existing forensic, authentication, parser, origin-tracing, and public-verification tests in `backend/tests/`.
- No customer testimonials, external benchmarks, or marketing claims are established; future UI must not invent them.

## Product Principles

- Trace threats to evidence, not just a label.
- Keep the investigation understandable from intake through verification.
- Protect sensitive origin information by access level.
- Preserve forensic integrity as part of the workflow.
- Make guest access useful without exposing protected evidence.
