/**
 * MerchantFlow Devnet x402 V2 preflight.
 * READ ONLY: performs one unpaid local GET and public Solana JSON-RPC reads.
 * Does not sign, submit, settle, request airdrops, or handle secret keys.
 */
import { DEVNET_CAIP2, isValidSolanaPublicKey } from "./config.ts";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const CIRCLE_DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAX_USDC_BASE_UNITS = 10_000n; // 0.01 USDC, 6 decimals
const MAX_HEADER_LENGTH = 16_384;

export interface ReadinessInputs {
  buyer: string;       // disposable public address ONLY
  recipient: string;   // expected recipient, separately configured
  mint?: string;       // trusted expected mint; default Circle Devnet USDC
  localUrl?: string;   // localhost-only, fixed resource path
}
export interface ValidatedChallenge {
  amountBaseUnits: string;
  asset: string;
  payTo: string;
  network: typeof DEVNET_CAIP2;
  scheme: "exact";
}
export interface ReadinessReport {
  status: "NOT_READY" | "PRECHECK_PASSED_ATA_UNVERIFIED";
  settlement: "NOT_ATTEMPTED";
  network: typeof DEVNET_CAIP2;
  buyer: string;
  recipient: string;
  mint: string;
  priceBaseUnits: string | null;
  buyerLamports: number | null;
  buyerUsdcBaseUnits: string | null;
  recipientTokenAccounts: number | null;
  warnings: string[];
  blockers: string[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected JSON object");
  return value as Record<string, unknown>;
}
function validAddress(value: string, label: string): void {
  if (!isValidSolanaPublicKey(value)) throw new Error(label + " is not a valid Solana public key");
}

export function parsePaymentRequired(
  encoded: string | null,
  expectedRecipient: string,
  expectedMint = CIRCLE_DEVNET_USDC_MINT
): ValidatedChallenge {
  validAddress(expectedRecipient, "Expected recipient");
  validAddress(expectedMint, "Expected mint");
  if (!encoded || encoded.length > MAX_HEADER_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("Missing, oversized, or malformed PAYMENT-REQUIRED header");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new Error("Noncanonical PAYMENT-REQUIRED encoding");
  }
  let parsed: Record<string, unknown>;
  try { parsed = object(JSON.parse(bytes.toString("utf8"))); }
  catch { throw new Error("PAYMENT-REQUIRED is not a valid JSON object"); }
  if (parsed.x402Version !== 2) throw new Error("Not an x402 V2 challenge");
  if (!Array.isArray(parsed.accepts) || parsed.accepts.length !== 1) {
    throw new Error("Expected exactly one payment requirement");
  }
  const offer = object(parsed.accepts[0]);
  if (offer.scheme !== "exact" || offer.network !== DEVNET_CAIP2) {
    throw new Error("Payment requirement is not Solana devnet exact");
  }
  if (typeof offer.payTo !== "string" || typeof offer.asset !== "string") {
    throw new Error("Missing payment recipient or asset");
  }
  validAddress(offer.payTo, "Payment recipient");
  validAddress(offer.asset, "Payment mint");
  if (offer.payTo !== expectedRecipient) throw new Error("Payment recipient mismatch");
  if (offer.asset !== expectedMint) throw new Error("Payment mint mismatch");
  if (typeof offer.amount !== "string" || !/^[1-9][0-9]*$/.test(offer.amount)) {
    throw new Error("Payment amount must be a positive integer string");
  }
  const amount = BigInt(offer.amount);
  if (amount > MAX_USDC_BASE_UNITS) throw new Error("Payment exceeds 0.01 USDC ceiling");
  return { amountBaseUnits: amount.toString(), asset: offer.asset, payTo: offer.payTo, network: DEVNET_CAIP2, scheme: "exact" };
}

export function validateLocalResource(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)
      || parsed.pathname !== "/api/merchant/inventory" || parsed.username || parsed.password
      || parsed.search || parsed.hash) {
    throw new Error("Readiness can only query the local unpaid inventory endpoint");
  }
  return parsed.toString();
}

type Fetcher = typeof fetch;
async function rpcRead(fetcher: Fetcher, method: string, params: unknown[]): Promise<Record<string, unknown>> {
  const allowed = new Set(["getGenesisHash", "getBalance", "getTokenAccountsByOwner"]);
  if (!allowed.has(method)) throw new Error("Write or unsupported RPC method rejected");
  const res = await fetcher(DEVNET_RPC_URL, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(5_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!res.ok) throw new Error("Devnet RPC " + method + " HTTP " + res.status);
  const data = object(await res.json());
  if (data.error !== undefined) throw new Error("Devnet RPC " + method + " rejected request");
  return data;
}

function parsedTokenAmounts(value: Record<string, unknown>, expectedMint: string): bigint[] {
  const list = object(value.result).value;
  if (!Array.isArray(list)) throw new Error("Invalid token account response");
  return list.map((entry: unknown) => {
    const info = object(object(object(object(entry).account).data).parsed).info;
    const fields = object(info);
    if (fields.mint !== expectedMint) throw new Error("Unexpected token mint returned");
    if (fields.state !== "initialized") throw new Error("Token account is not initialized and spendable");
    const tokenAmount = object(fields.tokenAmount).amount;
    if (typeof tokenAmount !== "string" || !/^(0|[1-9][0-9]*)$/.test(tokenAmount)) {
      throw new Error("Invalid token account balance");
    }
    return BigInt(tokenAmount);
  });
}

export async function inspectReadiness(inputs: ReadinessInputs, fetcher: Fetcher = fetch): Promise<ReadinessReport> {
  const mint = inputs.mint ?? CIRCLE_DEVNET_USDC_MINT;
  const url = validateLocalResource(inputs.localUrl ?? "http://127.0.0.1:3001/api/merchant/inventory");
  validAddress(inputs.buyer, "Buyer");
  validAddress(inputs.recipient, "Expected recipient");
  validAddress(mint, "Expected mint");
  if (inputs.buyer === inputs.recipient) throw new Error("Buyer and recipient must be distinct public addresses");

  const report: ReadinessReport = {
    status: "NOT_READY", settlement: "NOT_ATTEMPTED", network: DEVNET_CAIP2,
    buyer: inputs.buyer, recipient: inputs.recipient, mint,
    priceBaseUnits: null, buyerLamports: null, buyerUsdcBaseUnits: null,
    recipientTokenAccounts: null, warnings: [], blockers: []
  };

  try {
    const challengeResponse = await fetcher(url, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(5_000)
    });
    if (challengeResponse.status !== 402 || challengeResponse.redirected) throw new Error("Expected direct HTTP 402 challenge");
    const offer = parsePaymentRequired(challengeResponse.headers.get("payment-required"), inputs.recipient, mint);
    report.priceBaseUnits = offer.amountBaseUnits;
  } catch (e) {
    report.blockers.push("Payment challenge invalid: " + (e instanceof Error ? e.message : String(e)));
    return report;
  }

  try {
    const network = await rpcRead(fetcher, "getGenesisHash", []);
    if (network.result !== DEVNET_GENESIS) throw new Error("RPC genesis does not match Solana devnet");
    const sol = await rpcRead(fetcher, "getBalance", [inputs.buyer, { commitment: "confirmed" }]);
    const value = object(sol.result).value;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid buyer SOL balance");
    report.buyerLamports = value;
    if (value === 0) report.warnings.push("Buyer has 0 devnet SOL; fee sponsorship may be possible but is not confirmed by this probe");

    const tokenFilter = { mint };
    const parseConfig = { encoding: "jsonParsed", commitment: "confirmed" };
    const buyerTokens = await rpcRead(fetcher, "getTokenAccountsByOwner", [inputs.buyer, tokenFilter, parseConfig]);
    const recipientTokens = await rpcRead(fetcher, "getTokenAccountsByOwner", [inputs.recipient, tokenFilter, parseConfig]);
    const balances = parsedTokenAmounts(buyerTokens, mint);
    const recipients = parsedTokenAmounts(recipientTokens, mint);
    const total = balances.reduce((a, b) => a + b, 0n);
    report.buyerUsdcBaseUnits = total.toString();
    report.recipientTokenAccounts = recipients.length;
    if (total < BigInt(report.priceBaseUnits!)) report.blockers.push("Buyer lacks sufficient devnet USDC");
    if (recipients.length === 0) report.blockers.push("Recipient has no initialized token account for selected devnet USDC mint");
    if (recipients.length > 0) report.warnings.push("Recipient token account exists, but canonical ATA derivation is NOT independently verified");
    if (!report.blockers.length) report.status = "PRECHECK_PASSED_ATA_UNVERIFIED";
  } catch (e) {
    report.blockers.push("Devnet RPC precheck failed: " + (e instanceof Error ? e.message : String(e)));
  }
  return report;
}
