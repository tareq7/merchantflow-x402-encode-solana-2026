import { describe, test, expect } from "vitest";
import { loadEnv, DEVNET_CAIP2 } from "../src/config.ts";

describe("facilitator config — fail closed", () => {
  test("missing SOLANA_PAY_TO throws", () => {
    expect(() => loadEnv({ FACILITATOR_URL: "https://x402.org/facilitator" } as any)).toThrow(/SOLANA_PAY_TO/);
  });
  test("missing FACILITATOR_URL throws", () => {
    expect(() => loadEnv({ SOLANA_PAY_TO: "GCuigwG5dA9t6ws5wPtfidwMbsxh6QsfUTU88AQx7KnP" } as any)).toThrow(/FACILITATOR_URL/);
  });
  test("invalid Solana address throws", () => {
    expect(() => loadEnv({ SOLANA_PAY_TO: "not-an-address", FACILITATOR_URL: "https://x402.org/facilitator" } as any)).toThrow();
  });
  test("rejects a Base58 string that decodes to 34 bytes, not a 32-byte pubkey", () => {
    expect(() => loadEnv({ SOLANA_PAY_TO: "9W3k6Vuhq8KM9R6e6eK7a8a8a8a8a8a8a8a8a8a8a8a8a8a8", FACILITATOR_URL: "https://x402.org/facilitator" } as any)).toThrow(/32-byte/);
  });
  test("empty env throws", () => {
    expect(() => loadEnv({} as any)).toThrow();
  });
  test("valid env loads", () => {
    const env = loadEnv({ SOLANA_PAY_TO: "GCuigwG5dA9t6ws5wPtfidwMbsxh6QsfUTU88AQx7KnP", FACILITATOR_URL: "https://x402.org/facilitator" } as any);
    expect(env.SOLANA_PAY_TO).toBeDefined();
    expect(env.FACILITATOR_URL).toBe("https://x402.org/facilitator");
  });
  test("DEVNET_CAIP2 is correct", () => {
    expect(DEVNET_CAIP2).toBe("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
  });
});
