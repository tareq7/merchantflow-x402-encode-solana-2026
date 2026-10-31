import { describe, test, expect } from "vitest";
import { evaluatePolicy, createPolicyState, assertNoWalletSigning, POLICY_DEFAULTS } from "../src/policy.ts";

describe("bounded human-approved agent spend policy", () => {
  test("deny-by-default without approval token", () => {
    const state = createPolicyState();
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "human-ok-123" };
    const { decision } = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory" }, cfg, state);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("denied_no_approval");
  });

  test("allow with valid human approval within caps", () => {
    const state = createPolicyState();
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "human-ok-123", maxPerRequestUsd: 0.10, maxDailyUsd: 1.0, maxRequestsPerHour: 10 };
    const { decision, nextState } = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "human-ok-123" }, cfg, state);
    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("approved");
    expect(nextState.dailySpentUsd).toBeCloseTo(0.01);
  });

  test("deny over per-request cap", () => {
    const state = createPolicyState();
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "tok", maxPerRequestUsd: 0.05 };
    const { decision } = evaluatePolicy({ priceUsd: 0.10, endpoint: "GET /api/merchant/inventory", approvalToken: "tok" }, cfg, state);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("denied_over_per_request");
  });

  test("deny over daily cap cumulatively", () => {
    const cfg = { maxPerRequestUsd: 0.10, maxDailyUsd: 0.05, maxRequestsPerHour: 10, humanApprovalToken: "tok" };
    let state = createPolicyState();
    const r1 = evaluatePolicy({ priceUsd: 0.03, endpoint: "GET /api/merchant/inventory", approvalToken: "tok" }, cfg, state);
    expect(r1.decision.allowed).toBe(true);
    state = r1.nextState;
    const r2 = evaluatePolicy({ priceUsd: 0.03, endpoint: "GET /api/merchant/inventory", approvalToken: "tok" }, cfg, state);
    expect(r2.decision.allowed).toBe(false);
    expect(r2.decision.code).toBe("denied_over_daily");
  });

  test("rate-limit after maxRequestsPerHour", () => {
    const cfg = { maxPerRequestUsd: 1, maxDailyUsd: 10, maxRequestsPerHour: 2, humanApprovalToken: "tok" };
    let state = createPolicyState();
    const ts = Date.now();
    for (let i = 0; i < 2; i++) {
      const r = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "tok", timestamp: ts + i * 1000 }, cfg, state);
      expect(r.decision.allowed).toBe(true);
      state = r.nextState;
    }
    const denied = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "tok", timestamp: ts + 3000 }, cfg, state);
    expect(denied.decision.allowed).toBe(false);
    expect(denied.decision.code).toBe("denied_rate_limited");
  });

  test("forged request timestamp does not reset daily spending or rate limits", () => {
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "tok", maxPerRequestUsd: 0.10, maxDailyUsd: 1, maxRequestsPerHour: 1 };
    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const nearCap = { dailySpentUsd: 0.99, dayKey, requestTimestamps: [] };
    const future = evaluatePolicy({ priceUsd: 0.02, endpoint: "GET /api/merchant/inventory", approvalToken: "tok", timestamp: now + 86400000 }, cfg, nearCap);
    expect(future.decision.code).toBe("denied_over_daily");
    const rateState = { dailySpentUsd: 0, dayKey, requestTimestamps: [now] };
    const oldTimestamp = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "tok", timestamp: now - 86400000 }, cfg, rateState);
    expect(oldTimestamp.decision.code).toBe("denied_rate_limited");
  });

  test("malformed or non-finite spend limits always fail closed", () => {
    const state = createPolicyState();
    for (const maxDailyUsd of [NaN, Infinity, -1, 0]) {
      const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "tok", maxDailyUsd };
      const result = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "tok" }, cfg, state);
      expect(result.decision.code).toBe("denied_invalid_config");
    }
  });

  test("wrong approval token denied", () => {
    const state = createPolicyState();
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "correct" };
    const { decision } = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "wrong" }, cfg, state);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("denied_no_approval");
  });

  test("invalid price denied", () => {
    const state = createPolicyState();
    const cfg = { ...POLICY_DEFAULTS, humanApprovalToken: "tok" };
    for (const bad of [0, -1, NaN, Infinity]) {
      const { decision } = evaluatePolicy({ priceUsd: bad as number, endpoint: "GET /api/merchant/inventory", approvalToken: "tok" }, cfg, state);
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("denied_invalid_price");
    }
  });

  test("policy NEVER authorizes wallet signing", () => {
    expect(() => assertNoWalletSigning()).toThrow(/cannot authorize wallet signing/i);
    // Verify module does not export any signer
    // @ts-ignore
    expect((evaluatePolicy as any).sign).toBeUndefined();
  });

  test("no authorization bypass via missing config", () => {
    const state = createPolicyState();
    const cfg = { maxPerRequestUsd: 0.10, maxDailyUsd: 1.0, maxRequestsPerHour: 10 } as any;
    // No humanApprovalToken at all -> deny
    const { decision } = evaluatePolicy({ priceUsd: 0.01, endpoint: "GET /api/merchant/inventory", approvalToken: "any" }, cfg, state);
    expect(decision.allowed).toBe(false);
  });
});
