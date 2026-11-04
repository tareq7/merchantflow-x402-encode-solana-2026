/**
 * Optional client-side x402 pre-signing boundary for a LOCAL devnet demo.
 *
 * A wallet owner must explicitly supply the signer callback, and a valid
 * human approval token must already exist. It never reads keys or makes
 * payment/signing calls itself. It reads only an approved localhost HTTP 402.
 * The x402 server DOES NOT enforce these client budgets.
 * No durability/atomic reservation is offered across processes or concurrent
 * requests. Do not use this for production billing or automatic retries.
 */
import {
  evaluatePolicy, type PolicyConfig, type PolicyState, type PolicyDecision
} from "./policy.ts";
import {
  parsePaymentRequired, validateLocalResource,
  type ValidatedChallenge
} from "./readiness.ts";

export type ValidatedSignContext = Readonly<{ resourceUrl: string; offer: Readonly<ValidatedChallenge> }>;

export type PreSignResult<T> =
  | { status: "denied"; decision: PolicyDecision; nextState: PolicyState }
  | { status: "signed"; decision: PolicyDecision; nextState: PolicyState; offer: ValidatedChallenge; value: T };

export async function authorizeBeforeSigner<T>(input: {
  resourceUrl: string;
  approvedResourceUrl: string; // Separate human-approved/pinned target
  fetcher?: typeof fetch; // Only override with a trusted transport in TESTS
  expectedRecipient: string;
  approvalToken?: string;
  config: PolicyConfig;
  state: PolicyState;
  signer: (validatedContext: ValidatedSignContext) => Promise<T>;
}): Promise<PreSignResult<T>> {
  // Validate two independently supplied values: requested target and the
  // HUMAN-APPROVED target. A different localhost port is not approved.
  const resourceUrl = validateLocalResource(input.resourceUrl);
  const approved = validateLocalResource(input.approvedResourceUrl);
  if (resourceUrl !== approved) throw new Error("Resource URL differs from human-approved local target");
  // Obtain a new challenge from this exact endpoint, not from an unbound
  // caller-supplied PAYMENT-REQUIRED header. No wallet/settlement here.
  const response = await (input.fetcher ?? fetch)(resourceUrl, {
    method: "GET", redirect: "error", signal: AbortSignal.timeout(8000),
  });
  let offer: ValidatedChallenge;
  try {
    if (response.status !== 402) throw new Error("Expected HTTP 402 from approved local resource");
    // Strict x402 V2 exact scheme, pinned Solana Devnet, Circle test USDC,
    // exact recipient and <= 10,000 base units. Never authorize on failure.
    offer = parsePaymentRequired(response.headers.get("payment-required"), input.expectedRecipient);
  } finally {
    // Only the 402 status/header are needed. Cancel any unread stream on all
    // branches so repeated checks do not retain local HTTP connections.
    await response.body?.cancel();
  }
  const priceUsd = Number(BigInt(offer.amountBaseUnits)) / 1_000_000;
  const { decision, nextState } = evaluatePolicy({
    priceUsd,
    endpoint: "GET /api/merchant/inventory",
    approvalToken: input.approvalToken,
  }, input.config, input.state);
  if (!decision.allowed) return { status: "denied", decision, nextState };
  // Only the approved path may enter a caller-injected wallet signer.
  // The signer must still enforce human confirmation, one attempt and finality.
  // Bind the validated LOCAL resource to the approved quote handed to the signer.
  // A malicious callback could still ignore this contract; this is not a
  // security boundary for arbitrary signing implementations.
  const context: ValidatedSignContext = Object.freeze({ resourceUrl, offer: Object.freeze({ ...offer }) });
  const value = await input.signer(context);
  return { status: "signed", decision, nextState, offer, value };
}
