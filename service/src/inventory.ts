/**
 * Synthetic inventory data — no real seller data.
 * Used by the x402-protected GET /api/merchant/inventory endpoint.
 */

export type InventoryItem = {
  sku: string;
  marketplace: "Amazon.sa" | "Noon.sa";
  availableUnits: number;
  inboundUnits: number;
  avgDailyUnits: number;
  leadTimeDays: number;
  priceSar: number;
  currency: "SAR";
};

export const syntheticInventory: InventoryItem[] = [
  { sku: "MF-TEE-001", marketplace: "Amazon.sa", availableUnits: 42, inboundUnits: 100, avgDailyUnits: 3.2, leadTimeDays: 7, priceSar: 89.99, currency: "SAR" },
  { sku: "MF-HOOD-002", marketplace: "Amazon.sa", availableUnits: 18, inboundUnits: 0, avgDailyUnits: 2.1, leadTimeDays: 14, priceSar: 149.0, currency: "SAR" },
  { sku: "MF-MUG-003", marketplace: "Noon.sa", availableUnits: 120, inboundUnits: 200, avgDailyUnits: 5.5, leadTimeDays: 5, priceSar: 39.5, currency: "SAR" },
  { sku: "MF-CAP-004", marketplace: "Noon.sa", availableUnits: 7, inboundUnits: 30, avgDailyUnits: 1.8, leadTimeDays: 10, priceSar: 59.0, currency: "SAR" },
  { sku: "MF-TOTE-005", marketplace: "Amazon.sa", availableUnits: 0, inboundUnits: 50, avgDailyUnits: 2.0, leadTimeDays: 12, priceSar: 45.0, currency: "SAR" },
];

export function getInventory(): { generatedAt: string; items: InventoryItem[]; disclaimer: string } {
  return {
    generatedAt: new Date().toISOString(),
    items: syntheticInventory,
    disclaimer: "Synthetic demo data only. No real marketplace inventory. Served after x402 devnet payment verification.",
  };
}
