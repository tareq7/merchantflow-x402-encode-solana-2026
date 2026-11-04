/**
 * Optional client-side x402 pre-signing boundary for a LOCAL devnet demo.
 *
 * A wallet owner must explicitly supply the signer callback, and a valid
 * human approval token must already exist. It never reads keys or makes
 * network calls itself. The x402 server DOES NOT enforce these client budgets.
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
  paymentRequired: string | null;
  expectedRecipient: string;
  approvalToken?: string;
  config: PolicyConfig;
  state: PolicyState;
  signer: (validatedContext: ValidatedSignContext) => Promise<T>;
}): Promise<PreSignResult<T>> {
  // URL is deliberately restricted to localhost: no SSRF or remote payment.
  const resourceUrl = validateLocalResource(input.resourceUrl);
  // Strict x402 V2 exact scheme, pinned Solana Devnet, Circle test USDC, exact
  // recipient and <= 10,000 base units. A mismatch throws before signer call.
  const offer = parsePaymentRequired(input.paymentRequired, input.expectedRecipient);
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
  const context: ValidatedSignContext = Object.freeze({ resourceUrl, offer: Object.freeze(offer) });
  const value = await input.signer(context);
  return { status: "signed", decision, nextState, offer, value };
}
