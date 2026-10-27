# Security model and explicit spend gate
The public demo never requires an API key, login, paid call, or marketplace authorization. The frontend analyzes up to 2,000 canonicalized rows in memory. Only clicking the Meta assistant with a valid deployment-specific bearer token and an operator-enabled Worker flag can create a Meta Model API call. Production flags:
- `ALLOW_MODEL_CALLS=false` is the default. Leave it false until free credits are actually applied and the owner authorizes activating API billing.
- `MODEL_API_KEY` and `AI_ACCESS_TOKEN` are Cloudflare Worker secrets (never frontend/Vite variables, git, logs, or GitHub Actions).
- `POST /api/agent` denies requests without a valid bearer token; there is no anonymous paid endpoint.
- All model calls use bounded response tokens, a strict 25-second per-turn timeout and a 3-turn loop. These are cost-reduction controls, **not a true dollar spending cap**.
- Meta receives compact derived metrics and ranked evidence, not the raw CSV rows, but campaign/SKU identifiers may still be commercially sensitive. Only user-triggered, permissioned calls are allowed.
- The model is never authorized to mutate seller accounts, modify bids, or write real inventory.
- No real marketplace data or private client files are permitted in the public repository.
Additional production requirements: origin/authz hardening, abuse throttling, durable user consent, PII detection, rate limiting and a hard external spend breaker before exposing model functionality beyond a demo.
