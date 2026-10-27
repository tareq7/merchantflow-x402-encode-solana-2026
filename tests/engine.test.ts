import {describe,it,expect} from 'vitest';
import {analyze,type Ad,type Stock} from '../src/domain/engine';
const ad=(p:Partial<Ad>={}):Ad=>({date:'2026-10-26',marketplace:'Amazon.sa',sku:'85',campaign:'Exact 85',impressions:1000,clicks:100,orders:10,spendSar:100,revenueSar:700,unitCostSar:20,...p});
const stock=(p:Partial<Stock>={}):Stock=>({marketplace:'Amazon.sa',sku:'85',availableUnits:5,inboundUnits:0,avgDailyUnits:2,leadTimeDays:8,...p});
describe('SellerPilot financial decision engine',()=>{
 it('protects inventory despite outstanding ROAS',()=>{const x=analyze([ad()],[stock()]);expect(x.summary.roas).toBe(7);expect(x.opportunities[0]?.kind).toBe('STOCK_PROTECT');expect(x.opportunities[0]?.severity).toBe('critical');});
 it('estimates contribution but never pretends it is profit',()=>{const x=analyze([ad()],[stock()]);expect(x.summary.contributionSar).toBe(400);expect(x.warnings.join(' ')).toContain('NOT net profit');});
 it('handles zero denominators & missing stock',()=>{const x=analyze([ad({spendSar:0,revenueSar:0,clicks:0,orders:0})],[]);expect(x.summary.roas).toBeNull();expect(x.opportunities).toHaveLength(0);expect(x.warnings.join(' ')).toContain('Missing inventory');});
 it('never double-counts spend under overlapping alerts',()=>{const x=analyze([ad({orders:0,revenueSar:0,spendSar:250})],[stock()]);expect(x.opportunities.length).toBe(2);expect(x.summary.spendUnderReviewSar).toBe(250);});
 it('groups campaign periods consistently',()=>{const x=analyze([ad(),ad({spendSar:200,revenueSar:100,orders:2,clicks:50})],[stock()]);expect(x.summary.activeCampaigns).toBe(1);expect(x.summary.spendSar).toBe(300);});
 it('offers scaling only with sufficient stock runway',()=>{const x=analyze([ad()],[stock({availableUnits:1000})]);expect(x.opportunities.some(o=>o.kind==='SCALE_REVIEW')).toBe(true);});
});
