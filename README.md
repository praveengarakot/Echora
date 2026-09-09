# Echora

> Private signals, public certainty.

Echora is a privacy-first access window for Midnight Network. An operator publishes a rule, an expiry and a capacity. A member proves that a private signal clears the rule, while the signal, the phrase behind it and the source credential remain inside the proving session. The chain records only an anonymous, one-time receipt.

**Product track:** Level 3 — Private Allowlist Access  
**Network target:** Preview for browser deployment, Preprod for the public demo  
**Status:** Source, generated ZK assets, frontend flow, tests and CI are ready. Contract deployment, screenshots, live hosting and repository history are intentionally left for the project owner.

## The product idea

Private research rooms, beta releases and invitation-only gatherings need a way to answer one question — “is this person eligible?” — without collecting the person's credential, score or identity graph. Echora gives an operator a public window and gives a member a private proof path: publish the rule, prove the hidden signal, and record a replay-resistant receipt without publishing the reason for access.

## Why this is a real Midnight application

Echora is not a wallet-connect mock. Its Compact contract has:

- public ledger state for the rule, passport, lifecycle, issuer tag, capacity and accepted count;
- private witnesses for the member signal, member phrase and operator secret;
- deliberate `disclose()` calls at every public boundary;
- a domain-separated receipt nullifier to prevent the same private phrase being reused in one passport;
- operator-only pause, resume and window rotation circuits;
- browser proving and transaction balancing through the connected Midnight wallet;
- an indexer-backed Public Field that shows only the contract's intentional public state.

## Privacy model

### An observer can learn

- the contract address and the fact that a transaction was submitted;
- the published signal threshold, passport, issuer tag, expiry and capacity;
- whether the window is live or paused;
- the accepted count and the receipt nullifiers;
- that the `mark_passed` circuit accepted a proof.

### An observer cannot learn from the proof

- the member's private signal;
- the secret phrase used to derive the receipt;
- the source credential behind the signal;
- the operator secret;
- a wallet address as a circuit argument or a plaintext identity attached to a receipt.

A receipt is a public replay guard, not an identity record. Reusing the same phrase with the same passport produces the same public receipt and is therefore linkable within that passport; this is intentional single-use behavior. `disclose()` is not encryption: it is the Compact annotation that makes an intentional public write explicit. Echora never uses it on the private signal or phrase.

### Demo boundary and trust assumptions

The shipped Signal Gate uses an editable browser value as a **demo witness**. It proves only that the supplied value clears the rule; it does not prove that the value came from an issuer or credential. A production deployment must replace that input with a credential or attestation adapter. The browser also delegates proof generation to the connected wallet/prover service, so operators should choose a trusted wallet and understand its metadata policy. The ZK circuit does not publish the witness values, but transaction existence, timing, circuit shape and public ledger changes remain observable.


<!-- build-artifact-log: build(zkir): compile binary zkir format for mark_passed -->
