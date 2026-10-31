# REAL_X402_V2_STATUS.md — MerchantFlow x402 V2 — Truthful Real vs Simulated Claims

**Date:** 2026-10-31  
**Branch:** `feat/x402-v2-mvp`  
**Commit:** (see outcome.json / git log)  
**Network:** `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` (Solana devnet, CAIP-2)  
**Scheme:** `exact` via `@x402/core@2.29.0`, `@x402/express@2.29.0`, `@x402/svm@2.29.0`  
**Headers:** V2 `PAYMENT-REQUIRED` (402), `PAYMENT-SIGNATURE` (request), `PAYMENT-RESPONSE` (200) — NOT V1 `X-PAYMENT`  

> This document is the canonical truthful record required by the task. It distinguishes what is real, what is mocked, and what remains unverified.

## Summary

| Claim | Status | Evidence |
|---|---|---|
| x402 V2 middleware with Solana devnet exact scheme | ✅ Real, implemented | `service/src/x402.ts` registers `ExactSvmScheme` for `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`; `service/src/server.ts` uses `paymentMiddleware(routes, resourceServer)` from `@x402/express` |
| 402 PAYMENT-REQUIRED on unauthenticated `GET /api/merchant/inventory` | ✅ Real, tested | `service/tests/x402-402.test.ts` — 402 with `PAYMENT-REQUIRED` header, no inventory delivery; verified with official SDK middleware |
| V1 `X-PAYMENT` not used as primary | ✅ Real | Tests assert `PAYMENT-REQUIRED` presence and that `X-PAYMENT` alone does not grant access |
| Facilitator verification / fail-closed | ✅ Implemented | `service/src/config.ts:verifyFacilitatorSupports()` + `service/src/server.ts:startServer()` fails closed on init error; requires `FACILITATOR_URL` env; no embedded keys |
| Human-approved bounded agent spend policy (no wallet signing) | ✅ Implemented | `service/src/policy.ts` — deny-by-default, human approval token, per-request/daily/rate caps; `assertNoWalletSigning()` throws; module never signs |
| Synthetic inventory data only | ✅ Real | `service/src/inventory.ts` — 5 synthetic SKUs, no real seller data |
| Idempotency / replay handling | ✅ Documented | `GET /api/docs/x402` + this doc; delegates to facilitator/Solana transaction uniqueness |
| **Real Solana devnet settlement (USDC transfer on-chain, confirmed)** | ❌ NOT performed | No real USDC minted/transferred on devnet; no transaction signature produced; `FACILITATOR_URL` defaults to public facilitator but settlement not executed in CI/tests |
| Mock facilitator tests marked as MOCK | ✅ Done | `service/tests/x402-402.test.ts` MOCK suite explicitly labeled “clearly labeled as MOCK, not actual chain settlement” |
| Original React app unbroken | ✅ Verified | `npm test` / `npm run build` at repo root still pass (see outcome logs) |

## What is REAL

- **Middleware wiring:** `service/src/server.ts:paymentMiddleware(routes, resourceServer)` is the official `@x402/express` V2 middleware. It intercepts `GET /api/merchant/inventory`, validates `PAYMENT-SIGNATURE`, and only forwards to the handler after facilitator verification.
- **402 challenge:** Unauthenticated requests receive HTTP 402 with base64-encoded `PAYMENT-REQUIRED` JSON. Decoded challenge contains `network: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`, `scheme: exact`, `payTo: <SOLANA_PAY_TO>`, `price: $0.01`.
- **Environment enforcement:** `service/src/config.ts:loadEnv()` throws if `SOLANA_PAY_TO` or `FACILITATOR_URL` missing. No fallback embedded address.
- **Policy engine:** `service/src/policy.ts:evaluatePolicy()` enforces human approval token, caps, and rate limits. It cannot sign — `assertNoWalletSigning()` throws and no `signer` is imported.
- **Tests:** 22 service tests pass, including 402 non-delivery, V1 rejection, policy deny/allow, and config fail-closed.

## What is SIMULATED / MOCK

- **Facilitator settlement in tests:** Tests use a non-live `FACILITATOR_URL=https://x402.org/facilitator` but **do not actually call verify/settle** against a live Solana RPC for the 402 challenge generation. The MOCK-labeled test suite in `x402-402.test.ts` explicitly states it is not real settlement.
- **No real token movement:** No USDC was minted on devnet, no `spl-token create-account` executed, no transaction submitted to devnet RPC, no block confirmation observed.

## What is NOT done / Deployment limits

- **No live wallet:** No keypair generated, no private key stored, no signing in CI.
- **No funded facilitator:** Public facilitator may not have devnet USDC or may require operator setup; `verifyFacilitatorSupports()` will fail closed if facilitator does not advertise `exact` on `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`.
- **No mainnet exposure:** All amounts are `$0.01` devnet placeholder. Never use mainnet keys with this demo.
- **No production deploy:** Service not deployed to Vercel/Cloudflare Workers; `wrangler.toml` remains for the React app only. Service is separately startable via `npm run dev` in `service/`.

## Recipient Associated Token Account (ATA) Prerequisite

On Solana, USDC is an SPL token. The `SOLANA_PAY_TO` address **must** have an associated token account for the devnet USDC mint **before** any x402 settlement can succeed. Without it, the facilitator’s `settle` will fail even with a valid `PAYMENT-SIGNATURE`.

**Devnet USDC mint (example, verify via Solana devnet registry):** Check your facilitator’s devnet asset list — commonly `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` or facilitator-specific.

**Instructions:**

1. Generate a devnet recipient keypair (never commit the secret):
   ```bash
   solana-keygen new --no-outfile --no-bip39-passphrase
   # or via @solana/web3.js Keypair.generate()
   solana config set --url https://api.devnet.solana.com
   ```
2. Fund the recipient with devnet SOL for rent:
   ```bash
   solana airdrop 1 <SOLANA_PAY_TO> --url https://api.devnet.solana.com
   ```
3. Create the ATA for devnet USDC:
   ```bash
   spl-token create-account <DEVNET_USDC_MINT> --owner <SOLANA_PAY_TO> --url https://api.devnet.solana.com
   # Verify:
   spl-token accounts --owner <SOLANA_PAY_TO> --url https://api.devnet.solana.com
   ```
   Or via JS:
   ```ts
   import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
   const ata = await getAssociatedTokenAddress(usdcMint, new PublicKey(SOLANA_PAY_TO));
   ```
4. Set `SOLANA_PAY_TO` to that funded address and `FACILITATOR_URL` to a facilitator supporting devnet `exact`.
5. Start the service:
   ```bash
   cd service
   SOLANA_PAY_TO=<addr> FACILITATOR_URL=https://x402.org/facilitator npm run dev
   ```
6. Test 402 challenge:
   ```bash
   curl -i http://localhost:3001/api/merchant/inventory
   # -> 402 with PAYMENT-REQUIRED
   curl -i http://localhost:3001/health
   # -> 200
   ```

**Failure mode:** If ATA missing, facilitator `settle` returns error; client receives 402 or 500 after handler. The service logs `settlement_failed` and does not deliver inventory.

## Idempotency & Replay Protection

- **Delegated to facilitator + Solana:** Each `PAYMENT-SIGNATURE` contains a signed Solana transaction (exact scheme). The facilitator verifies the signature and submits the transaction once. Duplicate submission of the same signed transaction is rejected by Solana as already confirmed or by facilitator as replay.
- **No custom DB:** This MVP does not maintain an idempotency table; replay protection relies on blockchain nonce (recentBlockhash + lastValidBlockHeight) and facilitator verification.
- **PAYMENT-RESPONSE echo:** On success, `PAYMENT-RESPONSE` header contains base64-encoded `SettlementResponse` with transaction hash. Replaying the same `PAYMENT-SIGNATURE` will not credit twice; facilitator returns error.
- **Timeouts:** `maxTimeoutSeconds` can be set per route (default facilitator timeout). Expired transactions are rejected; client must create a new payment.

## Facilitator Requirements

- Must support `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` + `exact`.
- Must expose `/verify` and `/settle` as per x402 spec (v2).
- Must be reachable at `FACILITATOR_URL`; `GET /supported` or SDK `supported()` should list the required kind. Startup fails closed if not supported.
- For devnet, can be public `https://x402.org/facilitator` or self-hosted facilitator with Solana RPC.

## No False Chain Proof & No Real Money

- ✅ No real money moved. All prices are demo `$0.01`.
- ✅ No false chain proof claimed. No transaction hash presented as success.
- ✅ No credentials exposed. `.env.example` contains placeholder only.

## Verification Commands

```bash
# Root React app (must still pass)
npm ci && npm test && npm run build

# Service (x402 V2)
cd service
npm ci
npm run typecheck   # tsc --noEmit
npm test            # vitest — includes 402 non-delivery with official SDK
npm run build       # tsc --noEmit
SOLANA_PAY_TO=<devnet_addr> FACILITATOR_URL=https://x402.org/facilitator npm run dev
# curl 402 demo:
curl -i http://localhost:3001/api/merchant/inventory  # 402 PAYMENT-REQUIRED
curl -i http://localhost:3001/health                  # 200
```

## Prior Provenance

This repository is a full-history clone of `sellerpilot-ai` (Meta Global AI Developer Hackathon, Oct 2026). All SellerPilot code (React dashboard, deterministic engine, CSV import) is retained. New x402 Solana work is under `service/` and isolated; it does not modify `src/domain/*` logic.

**No final submission claims:** This V2 integration is an MVP for Encode Club Solana Hackathon 2026; final technical submission requires live devnet settlement evidence and is not claimed here.
