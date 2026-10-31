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
npm test          # 22 tests: 402 non-delivery, policy, config, mock-labeled
npm run typecheck
npm run build
```

Mock facilitator tests are explicitly labeled MOCK and do not represent real settlement — see `tests/x402-402.test.ts`.

## ATA Prerequisite

Recipient must have an associated token account (ATA) for devnet USDC before settlement. See `docs/REAL_X402_V2_STATUS.md` for `spl-token create-account` instructions.

## Idempotency / Replay

Delegated to facilitator + Solana transaction uniqueness. Same signed transaction cannot settle twice. See `docs/REAL_X402_V2_STATUS.md`.
