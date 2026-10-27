# SellerPilot AI — Hackathon submission material (October 27, 2026)

## Team name
SellerPilot AI

## Track
Startup Track — Build for Your World

## Problem statement
A seller can see 7× return on ad spend while the promoted item has only two days of inventory remaining. Amazon and Noon Ads report advertising performance, while stock, supplier lead times, unit economics, and fulfillment availability sit elsewhere. The result is deceptively profitable campaigns driving demand that cannot be fulfilled, plus reactive inventory cuts and wasted marketing spend. Saudi sellers also need a genuinely bilingual tool for these decisions.

## Project description
SellerPilot AI is a bilingual Arabic/English, stock-aware marketplace operations copilot for Amazon.sa and Noon.sa. It merges normalized advertising and inventory reports, computes explainable ROAS/ACoS/contribution estimates, ranks stockout and waste risks, and shows the exact formulas and records behind each finding. A what-if spend slider stress-tests stock runway while explicitly labeling assumptions. The seller approves proposed adjustments individually and exports a reviewed CSV; the system never silently changes live campaigns. Its local Data Lab includes a verified daily Amazon Sponsored Products advertised-product report importer with separate SKU costs and VAT controls, and a guided Noon daily SKU report mapper. A quality monitor flags stale reports, duplicates and inconsistent costs, and prevents approval on blocking errors.

The project was built during the October 26–November 4 hackathon as a new public React/TypeScript/Vite/Hono repository, with synthetic demos, a responsive Arabic RTL interface, serverless deployment, and a 50-test Vitest suite. Live demo: https://sellerpilot-ai-phi.vercel.app. Code: https://github.com/tareq7/sellerpilot-ai.

## Meta AI product and integration
The API integration targets Meta **Muse Spark 1.3 Contributor** (`muse-spark-1.3-contributor`) via the Meta Model API Chat Completions endpoint. It provides read-only tool calls (`get_verified_kpis` and `get_ranked_opportunities`) over deterministic calculations, letting Muse explain priorities conversationally in Arabic or English without inventing numbers or executing campaign changes. It uses a server-owned synthetic fixture for Contributor-mode privacy and bounds model calls to two turns and 400 output tokens. The tool loop is unit-tested with a mocked provider; **a genuine Contributor response was obtained through Meta's authenticated Model API playground on October 27, 2026**; the separate SellerPilot server-side tool-calling route remains gated and unverified end-to-end. The production model gate remains disabled while safe private credential access is investigated. This statement must be updated before submission if a real call succeeds.

## Why Meta models are important
The decision-critical money and stock formulas must remain exact, but Arabic/English explanations, prioritization across conflicting signals, contextual seller questions, and communicating causal caveats require flexible language reasoning. Muse is scoped as an interpretable read-only orchestrator over transparent functions rather than a generic chatbot or an autonomous ad spender. Contributor mode is suitable only for synthetic demo data because Meta may use inputs and outputs for model improvement.

## Demo links
Live app: https://sellerpilot-ai-phi.vercel.app
Repository: https://github.com/tareq7/sellerpilot-ai
Demo video: https://sellerpilot-ai-phi.vercel.app/demo-video.mp4 (2m54s, narrated live product screens and genuine Meta Contributor playground output; full SellerPilot tool-call path remains gated)

## Submission checklist
- [x] Video produced under 3 minutes with narration; verify the public deployment URL after its build finishes
- [x] Genuine Meta Contributor provider response confirmed via the official playground; SellerPilot gated tool-call endpoint remains unverified end-to-end.
- [ ] Submit final written content and agree to sharing/terms only if covered by authorization
- [ ] Capture confirmation receipt and final submitted URL

## Post-submission film update, October 27, 2026

The same submitted public video URL now serves a redesigned 112.3-second ElevenLabs v4 founder narration and a fully new visual treatment. The LLM chat ending was removed. Demo metrics remain synthetic, and SellerPilot server-side Muse calls remain privately gated.
