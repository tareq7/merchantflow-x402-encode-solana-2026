# Encode Club Solana Hackathon 2026 — Best Use of x402 on Solana — final-entry preparation

**Encode Club project:** MerchantFlow x402. A first checkpoint describing the idea has been saved separately. **Final working project NOT SUBMITTED.**

**New repo:** https://github.com/tareq7/merchantflow-x402-encode-solana-2026

MerchantFlow x402 is the proposed project already created and checkpoint-submitted on Encode Club: a Solana-devnet pay-per-request API for commerce agents that request inventory/pricing/logistics results, using x402 settlement and hard per-request budgets. The current imported SellerPilot code does NOT implement any x402 or Solana API, wallet, payment challenge or verification logic.

The previous Meta prototype is historical work, not new Solana integration. This imported baseline has no on-chain or x402 features.

- [ ] Implement real x402 payment-required HTTP flow for an API, data request, or AI agent tool.
- [ ] Process the payment on Solana devnet with actual verification or settlement evidence (no mocked success claimed as a real chain transaction).
- [ ] Only deliver the requested resource after verified payment; implement idempotency, rejected/expired payment and failure paths.
- [ ] Show an end-to-end working prototype, not just a dashboard or wallet-connect button.
- [ ] Provide a public repository with run instructions, a 2–4-minute demonstration video, and a clear description of the role of Solana.
- [ ] Disclose that SellerPilot AI is inherited from a separate Meta hackathon submission and document new x402/Solana changes.
