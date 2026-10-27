# SellerPilot AI

**The seller-controlled, inventory-aware AI operations cockpit for Amazon and Noon.**

Meta Global AI Developer Hackathon 2026 • Startup Track • Build for Your World.

This repository is developed during the October 26–November 4, 2026 hackathon. All demo records are synthetic. No marketplace credentials, seller order records, or private sales data belong here.

## Product thesis

An ad campaign can have great ROAS and still be a terrible business decision when stock will run out tomorrow. SellerPilot unifies paid media, inventory, and sales into one evidence-backed operations layer. Financial calculations are deterministic; Meta Muse models handle evidence-grounded explanation, questions, and action orchestration. No write action occurs without explicit seller approval.

## Safety commitments

- Zero background campaign writes or automatic budget changes.
- Synthetic demo data by default. No raw CSVs uploaded to third parties.
- API keys stay server-side; no secrets in the public repo.
- Deterministic arithmetic with traceable row-level evidence.
- Credit-aware, opt-in AI calls; demo stays functional without paid API access.

## Status

In active development; initial foundation committed first for transparent iteration history.

## Reproducible verification

\`\`\`sh
npm ci
npm test
npm run build
\`\`\`

The React interface imports real, synthetic Amazon/Noon reports locally in the browser. Two hosting paths are supported: Cloudflare Workers Assets (wrangler.toml) and Vercel Hobby (Vite SPA + server-side Hono API functions). Both default to an inactive Meta API. No model calls or marketplace actions are made in the public demo.

## Live hosted API safeguards

The \`/api/analyze\` route is deterministic. \`/api/agent\` returns 503 until an operator explicitly configures \`ALLOW_MODEL_CALLS=true\` with server-only \`MODEL_API_KEY\` and \`AI_ACCESS_TOKEN\`. **Hackathon credits must be confirmed before any enabled model use**; this flag is deliberately false for the demo deployment. No billing accounts or payment cards are changed.
