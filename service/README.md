# MerchantFlow x402 V2 Service — Solana Devnet Pay-Per-Request API

**Service path:** `service/` in `merchantflow-x402-encode-solana-2026`  
**Stack:** Express + `@x402/core@2.29.0` + `@x402/express@2.29.0` + `@x402/svm@2.29.0`  
**Network:** `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` (Solana devnet)  
**Scheme:** `exact` (fixed $0.01 USDC per request)  
**V2 headers:** `PAYMENT-REQUIRED` (402), `PAYMENT-SIGNATURE` (request), `PAYMENT-RESPONSE` (200) — not V1 `X-PAYMENT`

Separately startable from the React app (`npm run dev` at root).

## Quickstart

```bash
cd service
npm ci
npm run typecheck
npm test
# Set required env (no embedded keys)
export SOLANA_PAY_TO=YourDevnetAddress
export FACILITATOR_URL=https://x402.org/facilitator
export X402_PRICE='$0.01'   # optional
export PORT=3001            # optional
npm run dev   # or npm start
```

Health (unprotected):
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/docs/x402
```

Protected inventory (requires payment):
```bash
curl -i http://localhost:3001/api/merchant/inventory
# -> 402 Payment Required with PAYMENT-REQUIRED header
```

With x402 client (example):
```ts
import { wrapFetchWithPayment } from "@x402/fetch";
import { createSvmClient, toClientSvmSigner } from "@x402/svm";
// signer must be human-controlled wallet
const client = createSvmClient({ signer });
const paidFetch = wrapFetchWithPayment(fetch, client);
const res = await paidFetch("http://localhost:3001/api/merchant/inventory");
```

## Environment

| Var | Required | Example |
|---|---|---|
| `SOLANA_PAY_TO` | Yes | `So111...` (devnet base58) |
| `FACILITATOR_URL` | Yes | `https://x402.org/facilitator` |
| `X402_PRICE` | No | `$0.01` |
| `PORT` | No | `3001` |

Fail-closed: missing `SOLANA_PAY_TO`/`FACILITATOR_URL` throws on startup; facilitator that does not support `exact` on `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` fails closed.

## Endpoints

- `GET /health` — unprotected, shows x402 config
- `GET /api/docs/x402` — idempotency, replay, facilitator requirements, ATA prerequisite
- `GET /api/merchant/inventory` — **x402-protected**, synthetic inventory only, returns 402 without `PAYMENT-SIGNATURE`

## Policy Module

`src/policy.ts` — bounded human-approved spend policy. Deny-by-default, requires human approval token, enforces per-request/daily/rate caps, never signs.

```ts
import { evaluatePolicy, createPolicyState } from "./src/policy.ts";
const state = createPolicyState();
const { decision } = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "human-ok" }, config, state);
// decision.allowed === false if no approval — agent cannot self-approve signing
```

`assertNoWalletSigning()` always throws — policy never authorizes wallet signing.

## Testing

```bash
npm test          # 45 tests: 402 non-delivery, policy, readiness, config, mock-labeled
npm run typecheck
npm run build
```

Mock facilitator tests are explicitly labeled MOCK and do not represent real settlement — see `tests/x402-402.test.ts`.

## ATA Prerequisite

Recipient must have an associated token account (ATA) for devnet USDC before settlement. See `docs/REAL_X402_V2_STATUS.md` for `spl-token create-account` instructions.

## Idempotency / Replay

Delegated to facilitator + Solana transaction uniqueness. Same signed transaction cannot settle twice. See `docs/REAL_X402_V2_STATUS.md`.

### Read-only Solana Devnet x402 readiness probe

From `service/`, start the service locally as described above, then in a **separate shell**:

```bash
export SOLANA_PAY_TO=YourSeparateRecipientPublicKey
export DEVNET_BUYER_PUBLIC_KEY=YourDisposableDevnetBuyerPublicKey
# Optional: DEVNET_EXPECTED_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
npm run readiness
```

The probe only performs an unpaid GET to **localhost** `/api/merchant/inventory` and public read-only requests to `https://api.devnet.solana.com`. It requires a V2 `PAYMENT-REQUIRED` challenge for the **Solana devnet exact** scheme, pinned expected recipient and Circle's devnet USDC mint, and a maximum of **10,000 USDC base units ($0.01)**. It checks the actual devnet genesis hash, buyer's public SOL/USDC balance and the presence of recipient token accounts for that mint.

**No signing or payments occur.** The result always states `settlement: NOT_ATTEMPTED`; even `PRECHECK_PASSED_ATA_UNVERIFIED` does **not** prove canonical ATA derivation, fee sponsorship, settlement, replay protection, or a paid HTTP 200 response. A real devnet payment still requires a separate human-controlled signer and verified on-chain transaction receipt. Never set this command to mainnet addresses, secrets, paid API keys, or a live production URL. Treat a 0 SOL balance as a warning, because a facilitator *may* sponsor fees, not as proof that fees will be covered. The recipient's canonical associated token account must be verified/provisioned independently.
