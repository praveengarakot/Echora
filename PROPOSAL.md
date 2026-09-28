# Echora product proposal

## Selected Level 3 problem

**Private Allowlist Access** — prove membership without revealing identity.

## Problem

Private research rooms, beta programmes and invitation-only releases often ask for a screenshot, an account record or a wallet address. Those checks prove too much: they expose the credential itself, create a durable identity map or force a host to retain sensitive data that is not needed for the decision.

## Product

Echora creates a public access window with a private rule. An operator publishes a signal threshold, passport identifier, expiry and capacity. A member supplies a signal and a secret phrase as private witnesses. A Compact circuit proves that the hidden signal clears the visible threshold and records a passport-scoped receipt nullifier. The operator receives a verifiable one-time outcome; the member keeps the reason for eligibility private.

## Users

- Operators running private events, research cohorts, beta communities or credentialed releases.
- Members who need to prove eligibility without attaching a public identity to the room.
- Auditors who need a public, replay-resistant count rather than access to private credentials.

## Public/private data model

| Data | Location | Why |
|---|---|---|
| Signal threshold, passport, expiry, issuer tag, capacity and live state | Public ledger | Everyone must agree on the active rule and lifecycle |
| Accepted count | Public ledger | Aggregate usage is intentionally observable |
| Receipt nullifier | Public ledger | Prevents the same private phrase being reused in one passport |
| Eligibility signal | Private witness | Only the comparison result is required |
| Member phrase | Private witness | Derives a one-time receipt without exposing the preimage |
| Operator secret | Private witness | Authorizes lifecycle changes without a secret circuit argument |
| Source credential | Local adapter | The gate should not receive or store the underlying credential |

## Security decisions

- Receipt nullifiers use domain-separated `persistentHash` and include the current passport, preventing cross-window reuse and accidental linkage between purposes.
- The `mark_passed` circuit checks lifecycle, expiry, capacity, threshold and nullifier membership before writing the public result.
- Operator authorization compares the private witness-derived commitment with the public operator commitment.
- `disclose()` is used only at intentional public boundaries. Witness values are never written directly to the ledger.
- The UI calls out that its editable signal is a demo adapter. Production should replace it with a credential or attestation adapter that still returns only a private witness.

## Why Midnight

Compact makes the public/private boundary explicit through exported ledger state, witnesses, circuits and `disclose()`. Midnight can verify a proof of a private predicate while the witness stays outside the public ledger. The browser connector lets the wallet supply network configuration, proving and DUST balancing without a server holding member secrets.

## Scope and roadmap

### Level 1 — New Moon

Compile and test the four-circuit Echora window, generate managed ZK assets and deploy an initial window to Preview or Preprod.

### Level 2 — Waxing Crescent

Connect 1AM or Lace, generate a `mark_passed` proof from the Signal Gate, and publish a verifiable address plus a short demo.

### Level 3 — First Quarter

Harden the privacy boundary with contract tests, frontend type checking, CI and an indexed Public Field. Submit this Private Allowlist Access proposal for approval.

### Level 4 — Waxing Gibbous

Run a live MVP with an operator deployment console, pause/resume controls, complete user-facing and technical documentation, a release workflow and a public product profile.

### Later

Add verifiable credential adapters, rotating passport policies, selective operator receipts and a formal Compact/security review before mainnet use.
