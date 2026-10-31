import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyFacilitatorSupports } from "../src/config";
import { DEVNET_CAIP2 } from "../src/config";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("Fail-closed capability discovery", () => {
  it("permits only exact devnet advertised pair", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ kinds:[{ network:DEVNET_CAIP2, scheme:"exact" }] }) }));
    globalThis.fetch = spy as any;
    await expect(verifyFacilitatorSupports("https://example.invalid/facilitator")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledOnce();
  });
  it("rejects unsupported mainnet-only pair", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ kinds:[{network:"solana:mainnet",scheme:"exact"}] }) })) as any;
    await expect(verifyFacilitatorSupports("https://example.invalid/facilitator")).rejects.toThrow("did not advertise");
  });
  it("rejects empty or malformed capability lists", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ kinds:[] }) })) as any;
    await expect(verifyFacilitatorSupports("https://example.invalid")).rejects.toThrow("did not advertise");
  });
  it("rejects unavailable facilitators instead of warning and starting", async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error("offline"); }) as any;
    await expect(verifyFacilitatorSupports("https://example.invalid")).rejects.toThrow("network or timeout");
  });
  it("rejects unsupported HTTP response", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503 })) as any;
    await expect(verifyFacilitatorSupports("https://example.invalid")).rejects.toThrow("HTTP 503");
  });
  it("rejects insecure external endpoints", async () => {
    globalThis.fetch = vi.fn() as any;
    await expect(verifyFacilitatorSupports("http://example.invalid")).rejects.toThrow("HTTPS");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
