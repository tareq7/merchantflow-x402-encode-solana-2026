/**
 * Bounded human-approved agent spend policy.
 * This module NEVER authorizes wallet signing — it only decides whether a proposed
 * agent request is allowed under human-approved budgets. Actual payment (signing)
 * must be performed by the wallet owner via the official x402 client signer,
 * outside this policy.
 *
 * The policy is deny-by-default, requires explicit human approval token,
 * enforces per-request and cumulative limits, and rate-limits requests.
 */

export type PolicyConfig = {
  maxPerRequestUsd: number;   // e.g., 0.10 — max allowed price per x402 request
  maxDailyUsd: number;        // e.g., 1.00 — daily cumulative cap
  maxRequestsPerHour: number; // e.g., 10 — rate limit
  humanApprovalToken?: string; // must be set and matched for any approval
};

export type PolicyRequest = {
  priceUsd: number;           // proposed spend for this request
  endpoint: string;           // target endpoint, e.g., "GET /api/merchant/inventory"
  approvalToken?: string;     // human approval token presented by agent
  timestamp?: number;          // ms since epoch, defaults to Date.now()
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  remainingDailyUsd?: number;
  code: "approved" | "denied_no_approval" | "denied_over_per_request" | "denied_over_daily" | "denied_rate_limited" | "denied_invalid_price";
};

export type PolicyState = {
  dailySpentUsd: number;
  dayKey: string; // YYYY-MM-DD
  requestTimestamps: number[]; // timestamps within last hour
};

const DEFAULT_CONFIG: PolicyConfig = {
  maxPerRequestUsd: 0.10,
  maxDailyUsd: 1.00,
  maxRequestsPerHour: 10,
};

export function createPolicyState(): PolicyState {
  return { dailySpentUsd: 0, dayKey: dayKeyFor(Date.now()), requestTimestamps: [] };
}

function dayKeyFor(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function evaluatePolicy(
  req: PolicyRequest,
  config: PolicyConfig = DEFAULT_CONFIG,
  state: PolicyState
): { decision: PolicyDecision; nextState: PolicyState } {
  const now = req.timestamp ?? Date.now();
  const price = req.priceUsd;

  // Validate price
  if (!Number.isFinite(price) || price <= 0 || price > 1000) {
    return {
      decision: { allowed: false, reason: "Invalid price: must be finite positive <= 1000", code: "denied_invalid_price" },
      nextState: state,
    };
  }

  // Human approval required — never approve without explicit token match
  if (!config.humanApprovalToken || !req.approvalToken || req.approvalToken !== config.humanApprovalToken) {
    return {
      decision: { allowed: false, reason: "Denied: human approval token missing or mismatched. Agent cannot self-approve.", code: "denied_no_approval" },
      nextState: state,
    };
  }

  // Per-request cap
  if (price > config.maxPerRequestUsd) {
    return {
      decision: { allowed: false, reason: `Denied: price $${price.toFixed(2)} exceeds per-request cap $${config.maxPerRequestUsd.toFixed(2)}`, code: "denied_over_per_request" },
      nextState: state,
    };
  }

  // Daily cap — reset if new day
  let dailySpent = state.dailySpentUsd;
  let dayKey = state.dayKey;
  const currentDayKey = dayKeyFor(now);
  if (currentDayKey !== dayKey) {
    dailySpent = 0;
    dayKey = currentDayKey;
  }
  if (dailySpent + price > config.maxDailyUsd) {
    return {
      decision: { allowed: false, reason: `Denied: cumulative $${(dailySpent + price).toFixed(2)} would exceed daily cap $${config.maxDailyUsd.toFixed(2)}`, code: "denied_over_daily", remainingDailyUsd: Math.max(0, config.maxDailyUsd - dailySpent) },
      nextState: { ...state, dailySpentUsd: dailySpent, dayKey },
    };
  }

  // Rate limit: count requests in last hour
  const oneHourAgo = now - 60 * 60 * 1000;
  const recent = state.requestTimestamps.filter((t) => t > oneHourAgo);
  if (recent.length >= config.maxRequestsPerHour) {
    return {
      decision: { allowed: false, reason: `Denied: rate limited (${recent.length} requests in last hour, max ${config.maxRequestsPerHour})`, code: "denied_rate_limited" },
      nextState: { ...state, requestTimestamps: recent, dailySpentUsd: dailySpent, dayKey },
    };
  }

  // Approved — update state
  const nextState: PolicyState = {
    dailySpentUsd: dailySpent + price,
    dayKey,
    requestTimestamps: [...recent, now],
  };
  return {
    decision: { allowed: true, reason: "Approved under human-authorized budget", code: "approved", remainingDailyUsd: config.maxDailyUsd - nextState.dailySpentUsd },
    nextState,
  };
}

/**
 * Safety invariant: this module MUST NEVER provide wallet signing.
 * We expose this assertion for tests: import this symbol and verify it throws if signing is attempted.
 */
export function assertNoWalletSigning(): never {
  throw new Error("Policy module cannot authorize wallet signing: wallet signing must be performed by human-controlled signer outside this policy. See docs/REAL_X402_V2_STATUS.md");
}

// For auditability, export defaults
export const POLICY_DEFAULTS = DEFAULT_CONFIG;
