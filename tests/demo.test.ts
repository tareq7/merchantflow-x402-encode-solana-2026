import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseAds,parseStock} from '../src/domain/csv';
import {analyze} from '../src/domain/engine';
const root=new URL('../public/demo/',import.meta.url);
it('full synthetic case: 2 marketplaces, stock-aware, waste, growth',()=>{
 const ads=parseAds(readFileSync(new URL('ads.csv',root),'utf8'));
 const stock=parseStock(readFileSync(new URL('inventory.csv',root),'utf8'));
 const result=analyze(ads,stock);
 expect(result.summary.marketplaces).toBe(2);
 expect(result.summary.activeCampaigns).toBe(9);
 expect(result.summary.roas).toBeGreaterThan(0);
 expect(result.opportunities.some(a=>a.kind==='STOCK_PROTECT'&&a.sku==='TV85-FLAT')).toBe(true);
 expect(result.opportunities.some(a=>a.kind==='PAUSE_REVIEW'&&a.sku==='TV50-FLAT')).toBe(true);
 expect(result.opportunities.some(a=>a.kind==='SCALE_REVIEW'&&a.sku==='TV65-FLAT')).toBe(true);
 expect(result.summary.spendUnderReviewSar).toBeLessThanOrEqual(result.summary.spendSar);
});
