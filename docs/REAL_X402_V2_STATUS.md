# MerchantFlow x402 V2 — verified real Solana Devnet settlement

**Verified:** November 2, 2026. **Network:** Solana Devnet (CAIP-2 `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`). **Scheme:** `exact`. **Amount:** 0.01 valueless test USDC. **Final hackathon submission:** confirmed November 3, 2026 (Encode Final Checkpoint 3/3 and organizer receipt); judging pending.

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

The script performs *only* public read-only `getGenesisHash`, `getSignatureStatuses` and `getTransaction` calls to Solana Devnet. It checks the network, signature finality, token mint, payer and payee, **pinned source/destination token-account addresses**, exact transfer amount, sponsor payer and historical balance changes. **It does not independently derive canonical associated token accounts (ATAs).** The earlier verified canonical-PDA derivation was a separate Solana SDK check. Use the independent derivation command below to reproduce that additional assurance.

**Scope of proof:** Blockchain RPC proves the finalized on-chain transfer and fee payer; it cannot independently prove HTTP response headers. The HTTP 200, inventory response and `PAYMENT-RESPONSE` were observed in the actual local application run, not mocked.


## Recipient token account: create and verify on Devnet

The merchant recipient must have an **initialized, canonical SPL Token associated token account (ATA)** for the exact USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` before this facilitator can settle a payment.

**Free bootstrap (no SOL funding required by the recipient):** Open [Circle's official testnet faucet](https://faucet.circle.com/), select **USDC → Solana Devnet**, and enter your **disposable recipient public address**. A successful faucet transfer can create and rent-fund its associated USDC token account automatically, as verified for the original MerchantFlow buyer and recipient. Check the resulting transaction on Solana Devnet Explorer and confirm the minted token, owner, account and balance through the public RPC. Faucet limits and availability can change; do not claim funding until finalized.

**CLI alternative, only if you have an authorized funded Devnet fee payer:** `spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --owner YOUR_RECIPIENT_PUBLIC_KEY --url devnet` creates the owner's USDC associated account when the CLI is properly configured and transaction fees/rent are covered. It is a write action requiring a signer and may require Devnet SOL; do not run it merely to verify an existing account. Never use mainnet or paste private keys into commands.

Verify without signing, using an installed Solana CLI:

```bash
spl-token accounts --owner YOUR_RECIPIENT_PUBLIC_KEY --url devnet
```

To **independently derive both canonical ATA addresses** for the two *public* participants in this test (this runs locally and never signs), first install the pinned `service/` dependencies with `npm ci`, then run from the `service/` directory:

```bash
node --input-type=module <<'NODE'
import { address } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
const mint = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const wallets = [
  ['buyer', 'Eh7aZUfqSdzeT3MoFozkB2my236yiJqRqe916cJa53Za',
    '9sNouueeCcZw6Zx3qM1sESJNZqmtpKFC8z9JgzZ9HpzX'],
  ['merchant', 'Ev7owEPQLDn3LEsd6uPPakxNVU6dVk5syN2BDjob6LhQ',
    'DGXtE2iekWP2h78DuBJWp68C1NhowTCv3reDVNAUXYPs'],
];
for (const [label, owner, expected] of wallets) {
  const [actual] = await findAssociatedTokenPda({
    owner: address(owner), mint, tokenProgram: TOKEN_PROGRAM_ADDRESS
  });
  if (actual !== expected) throw new Error(label + ' canonical ATA mismatch');
  console.log(label + ': canonical ATA matches pinned account');
}
NODE
```

This second check is distinct from the dependency-free on-chain transaction verifier. Both must succeed before describing the pinned accounts as independently verified canonical ATAs. **Do not resend an already-settled payment or assume an arbitrary token account is the ATA.**

## Show an over-budget request rejected before signing (no spending)

The real `service/src/policy.ts` evaluates the proposed price against explicit human approval and per-request/daily/rate caps. From the repository root:

```bash
cd service
npm ci
npm run demo:budget-denial
```

The script feeds an encoded **$0.01 valid Devnet x402 quote** into the optional `authorizeBeforeSigner` boundary and denies it under a stricter **$0.005 client cap**; missing human approval and exceeded daily budget also fail. It asserts **zero invocations of the injected signer stub**. An additional test passes a genuine SDK-generated V2 HTTP 402 challenge through the same boundary. These tests use **synthetic approval and mock signers**; they load no wallet, do not send a payment request and create no Devnet transaction. CI runs both tests. This proves an *opt-in client-side* pre-signing guard can reject such requests. It is **not wired into the deployed resource server or all wallet clients**, has no durable multi-request accounting, and does not replace the real Nov 2 settlement proof.

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
- **Local paid proof versus public hosted service:** The original paid HTTP 200 happened on localhost, with one real Devnet test-USDC settlement. A separate [publicly deployed Render service](https://merchantflow-x402-solana-devnet-demo.onrender.com/api/docs/x402) currently exposes an unpaid x402 V2 HTTP 402 and configuration/health. **A new hosted signed-payment HTTP 200 has not been verified**, and the public service is not a judge-accessible wallet GUI. Read [the judge evidence map](JUDGE_START_HERE.md).
- **No real money:** These are Circle **Devnet test tokens**, not mainnet USDC or sponsor cash credits.
- **Clear provenance:** The React dashboard and SellerPilot marketplace logic predate this Solana challenge and were imported from an earlier Meta SellerPilot hackathon. New event-period work is in `service/`: x402 V2 middleware, approval policy, Solana preflight, tests, and the genuine Devnet payment proof.
- **Final submission completed:** The original Encode Final Checkpoint 3/3 entry was submitted November 3 and the organizer emailed a receipt. The 2:43 event video and eight-slide deck are publicly hosted in the [event-specific release](https://github.com/tareq7/merchantflow-x402-encode-solana-2026/releases/tag/video-v4-2026-11-03). The ElevenLabs Free-plan voice carries a noncommercial licensing caveat and attribution; no commercial-use rights are asserted. The final entry is submitted; judging/award status is still unknown.

The local/mock tests remain useful for regression; they are **not** relabeled as live settlement tests. The proof above is a separately executed real transaction, independently verifiable by the read-only script.
