/**
 * Judge demo: policy gates a validated x402 V2 Devnet quote before an injected
 * signer. Completely synthetic and offline: NO wallet, transaction, or API call.
 * cd service && npm run demo:budget-denial
 *
 * The real deployed x402 server protects the resource after settlement but
 * does NOT enforce these client budgets. Use this separate boundary only in a
 * human-controlled client; it has NO durable multi-session spend accounting.
 */
import { authorizeBeforeSigner } from "../src/client-authorization.ts";
import { createPolicyState } from "../src/policy.ts";
import { DEVNET_CAIP2 } from "../src/config.ts";
import { CIRCLE_DEVNET_USDC_MINT } from "../src/readiness.ts";

const recipient = "6b3pFThsK3VEKdRaGVmBqJJjU6rnV5uf3Z5R2BrDVf8x";
const resourceUrl = "http://127.0.0.1:3001/api/merchant/inventory";
const approval = "DEMO_ONLY_APPROVAL_NOT_A_REAL_TOKEN";
const challenge = Buffer.from(JSON.stringify({
  x402Version: 2,
  accepts: [{
    scheme: "exact", network: DEVNET_CAIP2, amount: "10000",
    asset: CIRCLE_DEVNET_USDC_MINT, payTo: recipient,
  }],
})).toString("base64");

let signerCalls = 0;
const signerStub = async () => {
  signerCalls++;
  throw Error("FAIL: rejected payment entered injected signer");
};
const cases = [
  { name: "over_per_request_cap", cap: 0.005, daily: 0, token: approval, expected: "denied_over_per_request" },
  { name: "missing_human_approval", cap: 0.01, daily: 0, token: undefined, expected: "denied_no_approval" },
  { name: "over_daily_cap", cap: 0.01, daily: 0.02, token: approval, expected: "denied_over_daily" },
];

for (const c of cases) {
  const state = createPolicyState();
  state.dailySpentUsd = c.daily;
  const result = await authorizeBeforeSigner({
    resourceUrl,
    paymentRequired: challenge,
    expectedRecipient: recipient,
    approvalToken: c.token,
    config: {
      maxPerRequestUsd: c.cap, maxDailyUsd: 0.02,
      maxRequestsPerHour: 2, humanApprovalToken: approval,
    },
    state,
    signer: signerStub,
  });
  if (result.status !== "denied" || result.decision.code !== c.expected || signerCalls !== 0) {
    throw Error("Fail-closed assertion failed: " + c.name);
  }
  console.log(JSON.stringify({
    scenario: c.name, quoteUsd: 0.01,
    perRequestCapUsd: c.cap, dailySpentUsd: c.daily,
    allowed: false, denialCode: result.decision.code,
    signerCalls, paymentAttempted: false,
    synthetic: true, integratedBoundary: true,
  }));
}
console.log("PASS: 3 x402 quotes denied before signer callback; no wallet or transaction.");
