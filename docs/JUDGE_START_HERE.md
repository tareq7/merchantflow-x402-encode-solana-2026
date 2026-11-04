# MerchantFlow x402 — Judge quick start

**Track:** Encode Club x Solana Foundation — Best Use of x402 on Solana  
**Network:** Solana Devnet only; 0.01 *test* USDC per read-only inventory request.  
**Source:** [MerchantFlow x402](https://github.com/tareq7/merchantflow-x402-encode-solana-2026)  
**Live service:** [Hosted x402 diagnostics](https://merchantflow-x402-solana-devnet-demo.onrender.com/api/docs/x402)  
**Video:** [2:43 MerchantFlow walkthrough](https://github.com/tareq7/merchantflow-x402-encode-solana-2026/releases/download/video-v4-2026-11-03/MerchantFlow_x402_ElevenLabs_v4_2026.mp4)  
**Slides:** [Eight-slide presentation](https://github.com/tareq7/merchantflow-x402-encode-solana-2026/releases/download/video-v4-2026-11-03/MerchantFlow_x402_Encode_Final_Deck.pptx)

MerchantFlow lets a commerce agent buy **one inventory answer** via x402 rather than subscribing to an entire data service. It is a sandbox demonstration with synthetic inventory. The x402 V2 Express middleware verifies payment before serving protected inventory. An independent human-controlled policy layer rejects requests outside the approved budget **before any wallet signing**. No production merchant or customer data is involved.

## Evidence to examine, in order

| Check | How to verify | Evidence status |
|---|---|---|
| Live unpaid paywall | `curl -i https://merchantflow-x402-solana-devnet-demo.onrender.com/api/merchant/inventory` | Hosted public endpoint returned **HTTP 402**, V2 `PAYMENT-REQUIRED`, no inventory. Recheck its current availability; the free host may wake from sleep. |
| Live configuration | [`/health`](https://merchantflow-x402-solana-devnet-demo.onrender.com/health), [`/api/docs/x402`](https://merchantflow-x402-solana-devnet-demo.onrender.com/api/docs/x402) | Public service exposes network, scheme, price and current limitations. |
| Over-budget refusal *before signing* | `cd service && npm ci && npm run demo:budget-denial` | Deterministic **dry run** invokes the real policy module, rejects a `$0.02` quote against `$0.01` cap; also rejects missing human approval and a daily cap overrun. Never loads wallet/secret or submits payment. CI runs this command. |
| Successful signed payment and delivery | See [original run evidence](REAL_X402_V2_STATUS.md) | A **single** human-approved transaction on Nov 2: actual localhost `402 → PAYMENT-SIGNATURE → 200 + inventory + PAYMENT-RESPONSE`, **not** a second demo payment. |
| Verifiable real settlement | [Devnet Solana Explorer](https://explorer.solana.com/tx/Gj8WB6fGmb3QQya3egcQBNDdMK2L6efhDL8cLukMXZc5MdAAfwAdadfKKrSRXKju9FoT125QgYg4nqYn6TbzFvA?cluster=devnet) | **Finalized** `transferChecked` of exactly 10,000 micro-test-USDC, buyer −10,000, merchant +10,000, facilitator-sponsored fee. |
| Independent chain proof | `node service/scripts/verify-devnet-x402-proof.mjs` (from repo root) | Read-only public RPC, pins transaction/mint/participants/amount/finality/balance changes. **No private key or new transfer.** |
| Failure and replay limitations | [Technical status and caveats](REAL_X402_V2_STATUS.md) | Missing/invalid approval and excessive spend denied; malformed or unsupported offers fail closed. Durable consumed-payment ledger and cross-instance replay protection **are not implemented**. |

### Reproduce the budget-cap refusal without spending anything

From the cloned repository:

```sh
cd service
npm ci
npm run demo:budget-denial
```

The output is machine-readable JSON, with three scenarios: `over_per_request_cap` (`denied_over_per_request`), `missing_human_approval` (`denied_no_approval`), and `over_daily_cap` (`denied_over_daily`). All three are required to report `allowed:false`, `signingAttempts:0`, `paymentAttempted:false`; otherwise the command fails.

**What this proves:** budget requests are blocked by the policy before the hypothetical signer is called, with no approval or token material leaving the process. **What it does not prove:** an actual payment was made by the script, production wallet-signing control, transactional accounting, or live hosted settlement. The signed, finalized Devnet transfer above is **separate evidence** for one successful request.

### Reproduce the live unpaid 402

```sh
curl -i https://merchantflow-x402-solana-devnet-demo.onrender.com/api/merchant/inventory
```

Expected: HTTP `402 Payment Required`, `PAYMENT-REQUIRED` x402 V2 challenge and **no inventory JSON**. The service also provides `/health` and `/api/docs/x402` without a payment. The production-environment host has **not** been independently verified to deliver HTTP 200 after a fresh signed payment. It would be inaccurate to represent a local success plus hosted unpaid 402 as a fresh hosted paid 200.

### Reproduce the already-finalized transaction, read-only

```sh
node service/scripts/verify-devnet-x402-proof.mjs
```

The script queries public Solana Devnet RPC and never touches wallet keys. The transaction proves a real devnet token transfer; blockchain data alone cannot prove the original local HTTP 200. That response and inventory delivery were observed in the actual application run and documented in [the evidence record](REAL_X402_V2_STATUS.md). A second payment requires a **fresh human authorization**, separate from this verifier.

### Limits and prior work

This is a **hackathon prototype**, not a safe production paywall for charged side effects. Synthetic inventory only; no durable receipt-consumption lock, refund semantics, multi-instance replay guard or exactly-once billing. Malformed quotes, insufficient capacity, errors and unknown settlement outcomes must be handled conservatively; never automatically resubmit an uncertain signature.

The inherited SellerPilot analytics/dashboard predates this Solana hackathon and was first built for a separate Meta challenge. The x402 V2 service, bounded spend policy, actual Nov 2 Devnet transaction, public verifier, event-specific tests and judge materials are the new Solana work. The 2:43 video is a **narrated reconstruction of evidence**, not a recording of a second payment. Audio was created with ElevenLabs under a Free-plan, noncommercial-attribution license; separate commercial usage permissions are not asserted here.

**Submission status:** MerchantFlow x402 Final Checkpoint 3/3 was submitted on **November 3, 2026** through Encode Club; the organizer's November 3 email acknowledged receipt. Judging and prize decisions remain pending. Changes to the source after this submission should be reflected in the existing editable entry, not duplicated.
