# CSV and analytical contract — v0.1
Only synthetic data ships. CSV UTF-8, <=600KB, <=2000 rows; currency SAR only.
- Ads: date,marketplace,sku,campaign,impressions,clicks,orders,spend_sar,revenue_sar,unit_cost_sar
- Inventory: marketplace,sku,available_units,inbound_units,avg_daily_units,lead_time_days
Marketplaces: Amazon.sa and Noon.sa. Ads revenue is net of VAT and attributed to report window; unit cost is estimated cost per item excluding fees/returns. Available stock excludes reserved units. Average daily units is recent demand velocity, not a guaranteed forecast. Zero velocity means unknown days of cover. Real-world source CSV contracts differ: adapt parsers explicitly rather than assuming this schema matches arbitrary native marketplace exports.

Contribution = net sales - units sold * unit COGS - ad spend. Excludes commissions, fulfillment, taxes, overhead, refunds. **Not net profit.** All actions require user approval and must be manually transferred to official marketplace consoles. Demo uses synthetic data exclusively.
