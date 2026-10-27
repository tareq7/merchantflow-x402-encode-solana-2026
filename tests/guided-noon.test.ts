import {describe,it,expect} from 'vitest';
import {normalizeNoonGuided as normalize,type NoonMapping} from '../src/domain/guided-noon';
import {analyze} from '../src/domain/engine';
const headers='Day,Ad Group,Item SKU,Views,Clicks,Orders,Units,Ad Spend,Sales,Currency';
const report=headers+'\n2026-10-26,Product Ads,TV75,2000,140,7,8,120,960,SAR';
const costs='sku,unit_cost_sar\nTV75,85';
const mapping:NoonMapping={date:'Day',campaign:'Ad Group',sku:'Item SKU',impressions:'Views',clicks:'Clicks',orders:'Orders',unitsSold:'Units',spend:'Ad Spend',revenue:'Sales',currency:'Currency'};
describe('Noon guided per-source mapping',()=>{
 it('correctly translates explicitly mapped SKU-level performance',()=>{
  const x=normalize(report,costs,mapping,'sales-net-of-vat',true);
  expect(x.ads[0]).toMatchObject({marketplace:'Noon.sa',orders:7,unitsSold:8,spendSar:120,revenueSar:960,unitCostSar:85});
  expect(analyze(x.ads,[]).summary.contributionSar).toBe(160);
 });
 it('converts VAT only when explicitly selected',()=>expect(normalize(report,costs,mapping,'sales-include-15pct-vat',true).ads[0]!.revenueSar).toBe(834.78));
 it('never guesses KSA currency',()=>expect(()=>normalize(report,costs,mapping,'sales-net-of-vat',false)).toThrow(/verify/));
 it('rejects malformed or misleading header selection',()=>expect(()=>normalize(report,costs,{...mapping,unitsSold:'Orders'},'sales-net-of-vat',true)).toThrow(/DISTINCT/));
 it('rejects non-SAR currencies',()=>expect(()=>normalize(report.replace(',SAR',',AED'),costs,mapping,'sales-net-of-vat',true)).toThrow(/non-SAR/));
 it('rejects missing product cost data',()=>expect(()=>normalize(report,'sku,unit_cost_sar\nOTHER,85',mapping,'sales-net-of-vat',true)).toThrow(/Missing seller SKU/));
 it('rejects invalid day and impossible purchases',()=>expect(()=>normalize(report.replace('2026-10-26','10/26/2026'),costs,mapping,'sales-net-of-vat',true)).toThrow(/YYYY-MM-DD/));
 it('sums same day ad-group fragments at campaign SKU grain',()=>{
  const two=report+'\n2026-10-26,Product Ads,TV75,1000,50,2,2,40,120,SAR';
  const x=normalize(two,costs,mapping,'sales-net-of-vat',true);expect(x.ads).toHaveLength(1);expect(x.ads[0]!.unitsSold).toBe(10);
 });
});
