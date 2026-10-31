/**
 * MerchantFlow x402 V2 — Service configuration and facilitator verification.
 * Requires SOLANA_PAY_TO and FACILITATOR_URL. Fails closed if facilitator
 * does not support solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1 with scheme "exact".
 * Never embeds keys; all values come from environment.
 */
import { z } from "zod";

export const DEVNET_CAIP2 = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;
export const REQUIRED_SCHEME = "exact" as const;

// Verify actual Base58-decoded public-key width, not just alphabet/character count.
export function isValidSolanaPublicKey(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let number = 0n;
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) return false;
    number = number * 58n + BigInt(digit);
  }
  const leadingZeroBytes = value.match(/^1*/)?.[0].length ?? 0;
  let nonzeroBytes = 0;
  while (number > 0n) { nonzeroBytes++; number >>= 8n; }
  return leadingZeroBytes + nonzeroBytes === 32;
}

const envSchema = z.object({
  SOLANA_PAY_TO: z.string().refine(isValidSolanaPublicKey, "Must be a 32-byte Base58 Solana public key"),
  FACILITATOR_URL: z.string().url(),
  X402_PRICE: z.string().default("$0.01"),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
});

export type ServiceEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ServiceEnv {
  const parsed = envSchema.safeParse({
    SOLANA_PAY_TO: env.SOLANA_PAY_TO,
    FACILITATOR_URL: env.FACILITATOR_URL,
    X402_PRICE: env.X402_PRICE,
    PORT: env.PORT,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Missing or invalid x402 service environment: ${issues}. Require SOLANA_PAY_TO and FACILITATOR_URL. See service/.env.example and docs/REAL_X402_V2_STATUS.md`);
  }
  return parsed.data;
}

/**
 * Fail-closed facilitator capability verification before binding any HTTP listener.
 * x402 V2 /supported must advertise the exact scheme+network pair; otherwise
 * do not serve payable routes. No payment signature is accepted here.
 */
export async function verifyFacilitatorSupports(
  facilitatorUrl: string,
  requiredNetwork: string = DEVNET_CAIP2,
  requiredScheme: string = REQUIRED_SCHEME
): Promise<void> {
  const url = new URL(facilitatorUrl);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("FACILITATOR_URL must be HTTPS or localhost HTTP");
  }
  const endpoint = new URL(url.pathname.replace(/\/$/, "") + "/supported", url);
  let response: Response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    throw new Error("Facilitator capability verification failed (network or timeout)");
  }
  if (!response.ok) throw new Error("Facilitator capability verification failed: HTTP " + response.status);
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error("Facilitator capability verification failed: non-JSON response");
  }
  const advertised = body?.kinds ?? body?.supported;
  if (!Array.isArray(advertised) || !advertised.some((item: any) =>
      item && item.x402Version === 2 && item.network === requiredNetwork && item.scheme === requiredScheme)) {
    throw new Error("Facilitator did not advertise x402 V2 exact scheme on required Solana devnet network");
  }
}

export function requireEnvOrThrow(): ServiceEnv {
  return loadEnv(process.env);
}
