# MerchantFlow x402 V2 — verified real Solana Devnet settlement

**Verified:** November 2, 2026. **Network:** Solana Devnet (CAIP-2 `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`). **Scheme:** `exact`. **Amount:** 0.01 valueless test USDC. **Final hackathon submission:** not yet confirmed.

This document replaces older pre-settlement notes. It distinguishes the real, finalized x402 transaction from local mocks and from capabilities that remain unproven.

## Confirmed end-to-end test

| Check | Evidence |
|---|---|
| Resource | `GET /api/merchant/inventory` on a transient localhost Express server from `service/src/server.ts` |
| Before payment | Actual HTTP 402 with V2 `PAYMENT-REQUIRED`; synthetic inventory was not delivered |
| Safety gates | Pinned Devnet network, `exact` scheme, Circle Devnet USDC mint, verified recipient and exactly 10,000 token base units; local approval policy limited the single request to $0.01 |
| Signed request | One V2 `PAYMENT-SIGNATURE` produced using the human-approved laptop-local disposable buyer signer, then sent **once** (no retries) |
| Facilitator | `https://x402.org/facilitator`, initialized and capability-checked before opening the endpoint |
| HTTP result | Actual **200**, synthetic inventory delivered, `PAYMENT-RESPONSE` present and settlement `success=true` |
| Transaction result | **Finalized** Solana Devnet transaction with `meta.err=null` and exact SPL `transferChecked` of 10,000 micro-USDC |
| Fee sponsorship | Facilitator fee payer `CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5` paid **10,001 lamports**; buyer had 0 SOL |
| Repeatability | Read-only independent verification available; no second paid transaction performed |

**Finalized transaction:** [Solana Explorer](https://explorer.solana.com/tx/Gj8WB6fGmb3QQya3egcQBNDdMK2L6efhDL8cLukMXZc5MdAAfwAdadfKKrSRXKju9FoT125QgYg4nqYn6TbzFvA?cluster=devnet)

```text
Gj8WB6fGmb3QQya3egcQBNDdMK2L6efhDL8cLukMXZc5MdAAfwAdadfKKrSRXKju9FoT125QgYg4nqYn6TbzFvA
```

The public finalized transaction's historical SPL Token balance arrays confirm:

| | Pre-transaction | Post-transaction | Change |
|---|---:|---:|---:|
| Buyer | 20,000,000 | 19,990,000 | −10,000 micro-USDC |
| Merchant | 20,000,000 | 20,010,000 | +10,000 micro-USDC |

Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle Devnet USDC, 6 decimals).

Buyer: `Eh7aZUfqSdzeT3MoFozkB2my236yiJqRqe916cJa53Za`, canonical ATA `9sNouueeCcZw6Zx3qM1sESJNZqmtpKFC8z9JgzZ9HpzX`.

Merchant: `Ev7owEPQLDn3LEsd6uPPakxNVU6dVk5syN2BDjob6LhQ`, canonical ATA `DGXtE2iekWP2h78DuBJWp68C1NhowTCv3reDVNAUXYPs`.

Both token-account addresses were independently derived via the official associated-token PDA derivation and matched the initialized on-chain accounts. Both wallets were funded with valueless Circle faucet Devnet USDC. Buyer key materials are **not included in this repository**.

## Reproduce the public chain verification — no wallet or payment required

```bash
node service/scripts/verify-devnet-x402-proof.mjs
```

The script performs *only* public read-only `getGenesisHash`, `getSignatureStatuses` and `getTransaction` calls to Solana Devnet. It fails closed if the network, signature finality, token mint, seller, buyer, source/destination associated token accounts, exact transfer amount, sponsor payer or balance changes differ.

**Scope of proof:** Blockchain RPC proves the finalized on-chain transfer and fee payer; it cannot independently prove HTTP response headers. The HTTP 200, inventory response and `PAYMENT-RESPONSE` were observed in the actual local application run, not mocked.

## Reproduce the unpaid challenge

```bash
cd service
npm ci
npm run typecheck && npm test && npm run build
export SOLANA_PAY_TO=YOUR_SEPARATE_DEVNET_RECIPIENT_ADDRESS
export FACILITATOR_URL=https://x402.org/facilitator
export X402_PRICE='$0.01'
npm run dev
curl -i http://localhost:3001/api/merchant/inventory
# HTTP 402, PAYMENT-REQUIRED V2, no inventory
```

For an **independent paid test**, use your own explicitly authorized disposable Devnet USDC wallet, verified recipient ATA and official x402 V2 SVM client. Check the network, recipient, mint and amount before signing. Never reuse or publish a wallet seed or blindly retry when settlement status is uncertain. `npm run readiness` only inspects public state and never signs or sends a transaction.

## Limits, provenance, and submission status

- **Not production-safe for side effects:** There is no durable consumed-payment ledger or atomic replay reservation. One successful settlement does *not* prove concurrent retry safety, exactly-once billing, refunds, or robust expiry/failure handling. This API returns **synthetic read-only inventory only**.
- **Local service, public chain:** The resource server ran on localhost; there is no claim of a deployed public payment endpoint or judge-accessible authenticated UI.
- **No real money:** These are Circle **Devnet test tokens**, not mainnet USDC or sponsor cash credits.
- **Clear provenance:** The React dashboard and SellerPilot marketplace logic predate this Solana challenge and were imported from an earlier Meta SellerPilot hackathon. New event-period work is in `service/`: x402 V2 middleware, approval policy, Solana preflight, tests, and the genuine Devnet payment proof.
- **Final submission unconfirmed:** A distinct 2–4-minute Solana/x402 demo, applicable licensing checks and actual organizer portal receipt remain outstanding. Do not treat this README or passing CI as a final hackathon entry.

The local/mock tests remain useful for regression; they are **not** relabeled as live settlement tests. The proof above is a separately executed real transaction, independently verifiable by the read-only script.
