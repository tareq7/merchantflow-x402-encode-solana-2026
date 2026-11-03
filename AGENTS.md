# MerchantFlow x402 — Agent Working Rules

## Project and scope

MerchantFlow x402 is an **event-specific Solana Devnet pay-per-request prototype** for synthetic merchant inventory. The new Express/x402 V2 service in `service/` returns a genuine `402 PAYMENT-REQUIRED` challenge to an unpaid agent and delivers the synthetic inventory only after authorized, verified payment. The root React SellerPilot analytics dashboard is inherited prior work; do not misrepresent it as newly built for the Solana challenge.

These instructions apply to any AI coding agent editing this repository. The human maintainer reviews and approves security-sensitive work before publication or payment.

## Setup and verification

Requires Node.js 22+ and npm. Run from repository root:

```bash
npm ci
npm test
npm run build
cd service
npm ci
npm run typecheck
npm test
npm run build
```

Check actual on-chain proof **without a wallet or a new payment**, from the root:

```bash
node service/scripts/verify-devnet-x402-proof.mjs
```

The last command reads publicly available Solana Devnet RPC data. CI/mock tests alone **do not prove** that a live settlement occurred. For a local unpaid demonstration, set only public `SOLANA_PAY_TO` and `FACILITATOR_URL=https://x402.org/facilitator` variables, start `cd service && npm run dev`, and request `GET /api/merchant/inventory`; expect a `402` challenge, not inventory data.

## Five review standards

1. **No autonomous token movement.**
   - **Applies to:** `service/src/**`, client signing code, integration scripts, CI workflows, examples and demos.
   - **Rule:** Never sign, send, airdrop or retry a Solana transaction automatically from tests, CI, or an agent. Only a distinct, explicitly human-approved, single-purpose **Devnet test-token** payment may be submitted by an authorized local signer after independently pinning the chain, asset, recipient and amount. No mainnet, real money, user wallet secrets, or automatic retry after an uncertain result.
   - **Why:** A valid API call is not permission to spend, and ambiguous settlement must not trigger duplicate charging.

2. **Fail closed on payment authorization.**
   - **Applies to:** `service/src/x402.ts`, `service/src/config.ts`, `service/src/server.ts`, `service/src/readiness.ts` and their tests.
   - **Rule:** Enforce x402 **V2**, `exact`, Solana Devnet `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`, separately configured `payTo`, Circle Devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, and price at most **10,000 base units**. Reject missing/mismatched/invalid challenges or unverifiable facilitator results. Never deliver the protected inventory for unpaid or invalid requests.
   - **Why:** A permissive fallback could silently authorize the wrong network, payee or amount, or leak a paid resource.

3. **Keep chain proof separate from HTTP and security guarantees.**
   - **Applies to:** `service/scripts/**`, `service/tests/**`, `docs/**`, demo narration, README and PR descriptions.
   - **Rule:** Label mocked facilitator tests **MOCK**. Public RPC can prove a finalized SPL transfer and historical token deltas, **not** an HTTP 200 response or exactly-once delivery. A verifier comparing pinned token accounts must not claim it computed canonical ATAs unless it independently derives the PDAs; demonstrate or link the separate derivation. Never claim replay safety without a durable tested consumed-payment ledger.
   - **Why:** Hackathon evidence should be independently reproducible without exaggerating what tests or blockchain receipts establish.

4. **Keep secrets and seller data out of development artifacts.**
   - **Applies to:** All source, commits, generated outputs, PRs, videos, tests and public documentation.
   - **Rule:** Use synthetic inventory only. Never commit private keys, recovery phrases, private merchant exports, API access tokens, signed payment payloads, internal operational trackers or customer records. Use public wallet addresses only when necessary to reproduce a public testnet proof. Remove credentials from logs and screenshots.
   - **Why:** Public GitHub history and AI-generated logs are long-lived disclosure surfaces.

5. **Make every change testable and attribute prior work.**
   - **Applies to:** Root app, `service/`, `docs/`, GitHub PRs and hackathon submissions.
   - **Rule:** Keep PRs focused. Run the relevant root and service checks from the commands above, document failure paths, wait for GitHub Actions to pass before merging, and disclose that the React dashboard derives from the earlier SellerPilot project. Do not use secret-bearing fixtures or break inherited behavior merely to make a demo look live.
   - **Why:** Reproducibility, incremental review and truthful provenance are more valuable than an impressive but unsupported claim.

## Most opinionated rule for Qodo Day 2

> **No autonomous token movement:** an AI agent may prepare or validate a payment, but it must not sign, submit or retry even a Devnet token transfer without a fresh human authorization for that exact recipient, token, network and amount.

**Why this exists:** MerchantFlow has already executed one genuine, sponsored 0.01 test-USDC payment, proving an API can settle without the buyer holding SOL. That success also makes it easy for a coding assistant to accidentally rerun a charge while testing. A one-attempt ledger and explicit approval prevented duplicate execution during the original test. This is a project-specific safety boundary rather than a general preference about coding style.
