/**
 * Judge demo: prove an over-budget inventory quote is stopped before signing.
 *
 * Dry run only. It never imports a wallet, invokes a facilitator, sends a
 * PAYMENT-SIGNATURE, or submits a blockchain transaction. All values are
 * synthetic. Usage: cd service && npm run demo:budget-denial
 */
import { evaluatePolicy, createPolicyState } from "../src/policy.ts";

const endpoint = "GET /api/merchant/inventory";
const config = {
  maxPerRequestUsd: 0.01,
  maxDailyUsd: 0.02,
  maxRequestsPerHour: 2,
  // Deliberately synthetic; NOT a real merchant or wallet approval token.
  humanApprovalToken: "DEMO_ONLY_APPROVAL",
};
let signingAttempts = 0;
function forbiddenSignerStub(): never {
  signingAttempts += 1;
  throw new Error("Safety failure: blocked payment reached signer");
}

const scenarios = [
  { name: "over_per_request_cap", priceUsd: 0.02, token: config.humanApprovalToken, expected: "denied_over_per_request" },
  { name: "missing_human_approval", priceUsd: 0.01, token: undefined, expected: "denied_no_approval" },
  { name: "over_daily_cap", priceUsd: 0.01, token: config.humanApprovalToken, expected: "denied_over_daily" },
];

for (const scenario of scenarios) {
  const state = createPolicyState();
  if (scenario.name === "over_daily_cap") state.dailySpentUsd = 0.02;
  const { decision } = evaluatePolicy(
    { priceUsd: scenario.priceUsd, endpoint, approvalToken: scenario.token },
    config,
    state
  );
  // The real wallet is not even imported by this standalone demonstration.
  // A safe pre-signing integration must bail out on every denied decision.
  if (decision.allowed) forbiddenSignerStub();
  if (decision.allowed || decision.code !== scenario.expected || signingAttempts !== 0) {
    throw new Error("Fail-closed assertion failed: " + scenario.name);
  }
  console.log(JSON.stringify({
    scenario: scenario.name,
    priceUsd: scenario.priceUsd,
    perRequestCapUsd: config.maxPerRequestUsd,
    dailyCapUsd: config.maxDailyUsd,
    allowed: decision.allowed,
    denialCode: decision.code,
    signingAttempts,
    paymentAttempted: false,
    synthetic: true,
  }));
}
console.log("PASS: all 3 rejected before signer; 0 signing calls; 0 transactions; 0 costs.");
