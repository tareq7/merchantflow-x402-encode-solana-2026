/**
 * Separately startable Express API with x402 V2 middleware.
 * GET /api/merchant/inventory is guarded by actual x402 middleware — unauthenticated requests
 * receive 402 with PAYMENT-REQUIRED and no inventory delivery.
 */
import express from "express";
import { paymentMiddleware, x402ResourceServer as ExpressResourceServer } from "@x402/express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { loadEnv, verifyFacilitatorSupports, DEVNET_CAIP2 } from "./config.ts";
import { getRoutes } from "./x402.ts";
import { getInventory } from "./inventory.ts";

export function buildApp(env = loadEnv()) {
  const app = express();
  app.use(express.json());

  // Health — unprotected
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "merchantflow-x402-service", x402Version: 2, network: DEVNET_CAIP2, scheme: "exact", payTo: env.SOLANA_PAY_TO, facilitator: env.FACILITATOR_URL, price: env.X402_PRICE, timestamp: new Date().toISOString() });
  });

  // Idempotency / replay documentation endpoint — unprotected, explains guarantees
  app.get("/api/docs/x402", (_req, res) => {
    res.json({
      x402Version: 2,
      network: DEVNET_CAIP2,
      scheme: "exact",
      price: env.X402_PRICE,
      payTo: env.SOLANA_PAY_TO,
      facilitator: env.FACILITATOR_URL,
      headers: { request: "PAYMENT-SIGNATURE", response: "PAYMENT-REQUIRED (402) and PAYMENT-RESPONSE (200)", legacy: "X-PAYMENT is V1 and NOT used" },
      idempotency: "Payment verification and settlement are delegated to the facilitator. The facilitator verifies the PAYMENT-SIGNATURE transaction and ensures the same signed transaction cannot settle twice. Replays of a spent transaction are rejected by the facilitator/blockchain; the resource server does not re-deliver on duplicate invalid signatures. Successful settlement responses include PAYMENT-RESPONSE with transaction metadata.",
      replayProtection: "Each x402 payment is a Solana transaction signed by the client. The facilitator verifies the signature and submits it once; duplicate submissions are rejected as already-confirmed or invalid by the Solana network. The service relies on facilitator verification — no custom idempotency DB is needed for MVP.",
      facilitatorRequirements: "Facilitator must support solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1 with scheme exact. It must expose /verify and /settle endpoints per x402 spec. The recipient address must have an associated USDC token account (ATA) on devnet prior to settlement — see docs/REAL_X402_V2_STATUS.md.",
      recipientATA: "On Solana, USDC is an SPL token. The SOLANA_PAY_TO address must have an ATA for the USDC mint on devnet; otherwise settlement fails even with valid payment. Create ATA via spl-token create-account or via facilitator helper before testing settlement.",
    });
  });

  // Build x402 resource server for Express
  const facilitatorClient = new HTTPFacilitatorClient({ url: env.FACILITATOR_URL });
  const resourceServer = new x402ResourceServer(facilitatorClient);
  resourceServer.register(DEVNET_CAIP2, new ExactSvmScheme());
  const routes = getRoutes(env);

  // Guarded inventory endpoint — must use actual x402 middleware
  // This middleware returns 402 PAYMENT-REQUIRED when unauthenticated, and only calls next() after PAYMENT-SIGNATURE verifies.
  app.use(paymentMiddleware(routes, resourceServer));

  // Only reachable after verified payment — synthetic data only
  app.get("/api/merchant/inventory", (_req, res) => {
    res.json(getInventory());
  });

  // 404
  app.use(( _req, res) => res.status(404).json({ error: "not_found" }));

  return { app, env, resourceServer, routes };
}

export async function startServer() {
  const env = loadEnv();
  // Verify facilitator supports required pair before starting; fail closed
  await verifyFacilitatorSupports(env.FACILITATOR_URL);
  const { app, resourceServer } = buildApp(env);
  // Initialize resource server against facilitator — this will fail closed if facilitator unsupported
  try {
    await resourceServer.initialize();
  } catch (e) {
    console.error("[x402] Facilitator initialization failed — failing closed:", e instanceof Error ? e.message : String(e));
    throw new Error(`Facilitator initialization failed for ${env.FACILITATOR_URL}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const server = app.listen(env.PORT, () => {
    console.log(`[merchantflow-x402-service] Listening on :${env.PORT} — x402 V2 ${DEVNET_CAIP2} exact ${env.X402_PRICE} -> ${env.SOLANA_PAY_TO} via ${env.FACILITATOR_URL}`);
  });
  return server;
}
