import { describe, expect, test, vi } from "vitest";
import request from "supertest";
import { buildApp } from "../src/server.ts";
import { authorizeBeforeSigner, type ValidatedSignContext } from "../src/client-authorization.ts";
import { createPolicyState } from "../src/policy.ts";
import { CIRCLE_DEVNET_USDC_MINT } from "../src/readiness.ts";
import { DEVNET_CAIP2 } from "../src/config.ts";

const RECIPIENT = "6b3pFThsK3VEKdRaGVmBqJJjU6rnV5uf3Z5R2BrDVf8x";
const url = "http://127.0.0.1:3001/api/merchant/inventory";
const config = (cap: number) => ({
  maxPerRequestUsd: cap, maxDailyUsd: 0.02,
  maxRequestsPerHour: 3, humanApprovalToken: "test-human",
});
function challenge(amount = "10000", payTo = RECIPIENT, network: string = DEVNET_CAIP2) {
  return Buffer.from(JSON.stringify({
    x402Version: 2,
    accepts: [{
      scheme: "exact", network, amount, payTo,
      asset: CIRCLE_DEVNET_USDC_MINT,
    }]
  })).toString("base64");
}

describe("actual pre-signing client boundary (mock signer; NO payment)", () => {
  test("real SDK-generated unpaid 402 is rejected above human cap BEFORE signer call", async () => {
    const { app } = buildApp({
      SOLANA_PAY_TO: RECIPIENT,
      FACILITATOR_URL: "https://x402.org/facilitator",
      X402_PRICE: "$0.01", PORT: 3001,
    } as any);
    const unpaid = await request(app).get("/api/merchant/inventory");
    expect(unpaid.status).toBe(402);
    expect(unpaid.body).not.toHaveProperty("items");
    const signer = vi.fn(async () => "NEVER-SIGNED");
    const outcome = await authorizeBeforeSigner({
      resourceUrl: url, paymentRequired: unpaid.headers["payment-required"] ?? null,
      expectedRecipient: RECIPIENT,
      approvalToken: "test-human", config: config(0.005),
      state: createPolicyState(), signer,
    });
    expect(outcome.status).toBe("denied");
    expect(outcome.decision.code).toBe("denied_over_per_request");
    expect(signer).not.toHaveBeenCalled();
  });

  test("missing human authorization and daily cap both block before mock signer", async () => {
    const signer = vi.fn(async () => "NO-CALL");
    const without = await authorizeBeforeSigner({
      resourceUrl: url, paymentRequired: challenge(),
      expectedRecipient: RECIPIENT, config: config(0.01),
      state: createPolicyState(), signer,
    });
    expect(without.status).toBe("denied");
    expect(without.decision.code).toBe("denied_no_approval");
    const cappedState = createPolicyState();
    cappedState.dailySpentUsd = 0.02;
    const overDaily = await authorizeBeforeSigner({
      resourceUrl: url, paymentRequired: challenge(),
      expectedRecipient: RECIPIENT, approvalToken: "test-human",
      config: config(0.01), state: cappedState, signer,
    });
    expect(overDaily.status).toBe("denied");
    expect(overDaily.decision.code).toBe("denied_over_daily");
    expect(signer).not.toHaveBeenCalled();
  });

  test("wrong network, payee, oversized quote and remote URL never invoke signer", async () => {
    const signer = vi.fn(async () => "NO-CALL");
    const args = {
      resourceUrl: url, paymentRequired: challenge(),
      expectedRecipient: RECIPIENT, approvalToken: "test-human",
      config: config(0.01), state: createPolicyState(), signer,
    };
    for (const edits of [
      { paymentRequired: challenge("10001") },
      { paymentRequired: challenge("10000", "6PcRervPBL9TXi1Cu4zHG9f6Gd5Cro1b6x3t9ewFmtfR") },
      { paymentRequired: challenge("10000", RECIPIENT, "solana:mainnet") },
      { resourceUrl: "https://external.example/api/merchant/inventory" }
    ]) await expect(authorizeBeforeSigner({ ...args, ...edits })).rejects.toThrow();
    expect(signer).not.toHaveBeenCalled();
  });

  test("approved path invokes injected MOCK signer once with validated 0.01 quote", async () => {
    const signer = vi.fn(async (context: ValidatedSignContext) => ({
      simulated: true, network: context.offer.network, amount: context.offer.amountBaseUnits,
      endpoint: context.resourceUrl, frozen: Object.isFrozen(context) && Object.isFrozen(context.offer)
    }));
    const result = await authorizeBeforeSigner({
      resourceUrl: url, paymentRequired: challenge(),
      expectedRecipient: RECIPIENT, approvalToken: "test-human",
      config: config(0.01), state: createPolicyState(), signer,
    });
    expect(result.status).toBe("signed");
    expect(signer).toHaveBeenCalledTimes(1);
    if (result.status !== "signed") throw Error("unexpected denial");
    expect(result.value.simulated).toBe(true);
    expect(result.value.amount).toBe("10000");
    expect(result.value.endpoint).toBe(url);
    expect(result.value.frozen).toBe(true);
    expect(signer.mock.calls[0]![0].resourceUrl).toBe(url);
    expect(result.nextState.dailySpentUsd).toBeCloseTo(0.01);
    // This is an injected MOCK callback, not a wallet and NOT a transaction.
  });
});
