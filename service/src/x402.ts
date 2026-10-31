/**
 * x402 V2 resource server setup for Solana devnet exact scheme.
 * Uses CAIP-2: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1, scheme "exact".
 * V2 headers: PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE (not V1 X-PAYMENT).
 */
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import type { ServiceEnv } from "./config.ts";
import { DEVNET_CAIP2 } from "./config.ts";

export function createResourceServer(env: ServiceEnv): x402ResourceServer {
  const facilitator = new HTTPFacilitatorClient({ url: env.FACILITATOR_URL });
  const server = new x402ResourceServer(facilitator);
  server.register(DEVNET_CAIP2, new ExactSvmScheme());
  return server;
}

export function getRoutes(env: ServiceEnv) {
  return {
    "GET /api/merchant/inventory": {
      accepts: [
        {
          scheme: "exact" as const,
          price: env.X402_PRICE,
          network: DEVNET_CAIP2,
          payTo: env.SOLANA_PAY_TO,
        },
      ],
      description: "MerchantFlow synthetic inventory — Solana devnet pay-per-request via x402 V2 exact scheme",
      mimeType: "application/json",
    },
  };
}
