import { startServer } from "./server.ts";

startServer().catch((e) => {
  console.error("Failed to start merchantflow-x402-service:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
