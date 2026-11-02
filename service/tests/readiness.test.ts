import { describe, expect, test, vi } from "vitest";
import request from "supertest";
import { buildApp } from "../src/server.ts";
import {
  CIRCLE_DEVNET_USDC_MINT, DEVNET_GENESIS, DEVNET_RPC_URL,
  inspectReadiness, parsePaymentRequired, validateLocalResource
} from "../src/readiness.ts";
import { DEVNET_CAIP2 } from "../src/config.ts";

const BUYER = "6PcRervPBL9TXi1Cu4zHG9f6Gd5Cro1b6x3t9ewFmtfR";
const RECIPIENT = "6b3pFThsK3VEKdRaGVmBqJJjU6rnV5uf3Z5R2BrDVf8x";
const MINT = CIRCLE_DEVNET_USDC_MINT;
const offered = (overrides: Record<string, unknown> = {}) => Buffer.from(JSON.stringify({
  x402Version: 2,
  accepts: [{ scheme: "exact", network: DEVNET_CAIP2, amount: "10000", asset: MINT, payTo: RECIPIENT, ...overrides }]
})).toString("base64");
const tokenAccount = (amount: string) => ({
  account: { data: { parsed: { info: { mint: MINT, state: "initialized", tokenAmount: { amount } } } } }
});
function mockFetch(challenge = offered(), buyerUsdc = "20000", recipientExists = true, genesis = DEVNET_GENESIS) {
  const methods: string[] = [];
  const f = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:")) {
      expect(init?.method).toBe("GET");
      return new Response(null, { status: 402, headers: { "payment-required": challenge } });
    }
    expect(url).toBe(DEVNET_RPC_URL);
    expect(init?.method).toBe("POST");
    const req = JSON.parse(String(init?.body));
    methods.push(req.method);
    if (req.method === "getGenesisHash") return Response.json({ jsonrpc: "2.0", id: 1, result: genesis });
    if (req.method === "getBalance") return Response.json({ jsonrpc: "2.0", id: 1, result: { value: 0 } });
    if (req.method === "getTokenAccountsByOwner") {
      const pubkey = req.params[0];
      return Response.json({ jsonrpc: "2.0", id: 1, result: {
        value: pubkey === BUYER ? [tokenAccount(buyerUsdc)] : (recipientExists ? [tokenAccount("0")] : [])
      } });
    }
    throw new Error("Unexpected RPC method: " + req.method);
  });
  return { f: f as unknown as typeof fetch, methods };
}
const args = { buyer: BUYER, recipient: RECIPIENT };

describe("strict x402 challenge validation (NO signing)", () => {
  test("accepts exactly one expected devnet USDC offer under 0.01", () => {
    expect(parsePaymentRequired(offered(), RECIPIENT).amountBaseUnits).toBe("10000");
  });
  test("denies no header, corrupt base64, bad JSON and wrong protocol version", () => {
    expect(() => parsePaymentRequired(null, RECIPIENT)).toThrow();
    expect(() => parsePaymentRequired("invalid$$", RECIPIENT)).toThrow();
    expect(() => parsePaymentRequired(Buffer.from("{").toString("base64"), RECIPIENT)).toThrow();
    expect(() => parsePaymentRequired(Buffer.from(JSON.stringify({ x402Version: 1, accepts: [] })).toString("base64"), RECIPIENT)).toThrow();
  });
  test("rejects a too-large header", () => {
    expect(() => parsePaymentRequired("A".repeat(16_385), RECIPIENT)).toThrow();
  });
  test("rejects mainnet, wrong scheme, recipient and mint", () => {
    for (const wrong of [
      { network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" },
      { scheme: "upto" }, { payTo: BUYER }, { asset: RECIPIENT }
    ]) expect(() => parsePaymentRequired(offered(wrong), RECIPIENT)).toThrow();
  });
  test("denies high price, zero price, decimal and exponential price", () => {
    for (const amount of ["10001", "0", "0.1", "1e4", "99999999999999999999999999"]) {
      expect(() => parsePaymentRequired(offered({ amount }), RECIPIENT)).toThrow();
    }
  });
  test("rejects multiple offers and malformed addresses", () => {
    const duplicated = Buffer.from(JSON.stringify({
      x402Version: 2, accepts: [{ scheme: "exact" }, { scheme: "exact" }]
    })).toString("base64");
    expect(() => parsePaymentRequired(duplicated, RECIPIENT)).toThrow();
    expect(() => parsePaymentRequired(offered(), "not-a-key")).toThrow();
  });
  test("local URL allowlist blocks arbitrary web, credentials and other routes", () => {
    expect(validateLocalResource("http://127.0.0.1:3001/api/merchant/inventory")).toMatch("127.0.0.1");
    for (const u of ["https://example.com/api/merchant/inventory", "http://evil.local/api/merchant/inventory",
      "http://127.0.0.1:3001/admin", "http://user:pass@localhost:3001/api/merchant/inventory",
      "http://localhost:3001/api/merchant/inventory?secret=x"]) {
      expect(() => validateLocalResource(u)).toThrow();
    }
  });
});
describe("read-only public RPC preflight", () => {
  test("with funded USDC and receiver token account, passes limited precheck but never asserts ATA or settlement", async () => {
    const { f, methods } = mockFetch();
    const r = await inspectReadiness(args, f);
    expect(r.status).toBe("PRECHECK_PASSED_ATA_UNVERIFIED");
    expect(r.settlement).toBe("NOT_ATTEMPTED");
    expect(r.buyerLamports).toBe(0);
    expect(r.warnings.join(" ")).toContain("ATA");
    expect(methods).toEqual(["getGenesisHash", "getBalance", "getTokenAccountsByOwner", "getTokenAccountsByOwner"]);
  });
  test("unfunded buyer or recipient token account missing -> NOT_READY", async () => {
    const s = mockFetch(offered(), "0", false);
    const result = await inspectReadiness(args, s.f);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockers.join(" ")).toContain("lacks sufficient");
    expect(result.blockers.join(" ")).toContain("Recipient");
  });
  test("genesis mismatch fails closed before other RPC reads", async () => {
    const s = mockFetch(offered(), "20000", true, "MAINNET");
    const result = await inspectReadiness(args, s.f);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockers.join(" ")).toContain("genesis");
    expect(s.methods).toEqual(["getGenesisHash"]);
  });
  test("wrong challenge never invokes RPC", async () => {
    const s = mockFetch(offered({ network: "solana-mainnet" }));
    const result = await inspectReadiness(args, s.f);
    expect(result.status).toBe("NOT_READY");
    expect(s.methods).toEqual([]);
  });
  test("same buyer and recipient are prohibited", async () => {
    const s = mockFetch();
    await expect(inspectReadiness({ buyer: BUYER, recipient: BUYER }, s.f)).rejects.toThrow();
    expect(s.methods).toEqual([]);
  });
});


// The SDK-generated challenge must be accepted by the independent preflight parser.
describe("real x402 SDK middleware compatibility (still UNPAID)", () => {
  test("parses actual SDK-generated V2 402 and pinned Devnet USDC asset", async () => {
    const { app } = buildApp({
      SOLANA_PAY_TO: RECIPIENT, FACILITATOR_URL: "https://x402.org/facilitator",
      X402_PRICE: "$0.01", PORT: 3999
    } as any);
    const res = await request(app).get("/api/merchant/inventory");
    expect(res.status).toBe(402);
    const actualOffer = parsePaymentRequired(res.headers["payment-required"] ?? null, RECIPIENT, MINT);
    expect(actualOffer.amountBaseUnits).toBe("10000");
    expect(res.body).not.toHaveProperty("items");
  });
});
