# Amazon Ads daily report import — verified field contract

SellerPilot AI imports **Sponsored Products → Advertised product report** in CSV format, alongside its canonical importer.

Source: [Amazon Ads advertised-product report (updated Feb 27, 2026)](https://advertising.amazon.com/help/GYNVHW8R4QPYUS9H).

## Required report settings

1. In Amazon Ads Reporting, select Sponsored Products → Advertised product report.
2. Set Time unit: **Daily** (not summary) and export CSV.
3. Verify correct Saudi account and **SAR** currency.
4. Prepare your own private cost-reference CSV with headers **sku,unit_cost_sar**.
5. In SellerPilot Data Lab, upload both CSVs, explicitly specifying whether promoted sales are net of VAT or INCLUDE 15% Saudi VAT.
6. Upload canonical inventory CSV separately. Demo inventory is NOT substituted for private stock.
7. Inspect Data Trust Monitor; blocking problems prevent proposal staging.

| Amazon report field | SellerPilot treatment |
|---|---|
| Start Date and End Date | Must be SAME day, YYYY-MM-DD. Multi-day summary rejected. |
| Campaign Name | Campaign identifier |
| Advertised SKU | Seller advertising SKU |
| Impressions | Integer |
| Clicks | Integer |
| Cost | Ad spend SAR |
| Sales (promoted) | SKU-specific promoted sales, not total halo sales |
| Units sold (promoted) | Promoted SKU units for COGS |
| Purchases | Attributed purchase count, potentially including halo |
| Currency | Must be SAR when provided |

Amazon attributed purchases need NOT equal advertised SKU units sold. We preserve both and use **promoted units** times privately supplied SKU cost for estimated COGS, not total purchases times SKU cost. Imported daily ad-group rows are rolled up by date + SKU + campaign.

The public repo stores no private advertiser data or API keys. Raw uploaded CSVs are handled in the browser and do not transit the server. Files and automated regression tests: src/domain/native-amazon.ts and tests/native-amazon.test.ts (9 new cases).

**Noon:** Ad Manager officially exposes ad spend, revenue, ROAS, CTR, clicks, views, orders and SKU-level metrics ([Noon FAQ](https://adsupport.noon.com/en/articles/10767013-ad-manager-faqs)). Its exact native Ad Manager CSV/Excel export template was not independently verified; SellerPilot accepts **canonical normalized Noon CSV**, not unspecified native Noon exports. Noon stock/price bulk templates are not advertising-performance reports.
