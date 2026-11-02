/** Read-only developer convenience CLI; no keys or transaction submissions. */
import { inspectReadiness } from "./readiness.ts";

async function main() {
  const buyer = process.env.DEVNET_BUYER_PUBLIC_KEY;
  const recipient = process.env.SOLANA_PAY_TO;
  if (!buyer || !recipient) {
    console.error("Set DEVNET_BUYER_PUBLIC_KEY and SOLANA_PAY_TO to distinct PUBLIC devnet addresses.");
    process.exitCode = 2;
    return;
  }
  const report = await inspectReadiness({
    buyer, recipient, mint: process.env.DEVNET_EXPECTED_USDC_MINT,
    localUrl: process.env.DEVNET_LOCAL_RESOURCE_URL
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.blockers.length > 0) process.exitCode = 1;
}
main().catch((error) => {
  console.error("Read-only readiness probe failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
