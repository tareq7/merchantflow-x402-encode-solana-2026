import {describe,it,expect} from 'vitest';
import {auditReports} from '../src/domain/data-quality';
import type {Ad,Stock} from '../src/domain/engine';
const row=(x:Partial<Ad>={}):Ad=>({marketplace:'Noon.sa',sku:'65',campaign:'Search',date:'2026-10-26',impressions:500,clicks:60,orders:5,spendSar:60,revenueSar:300,unitCostSar:50,...x});
const stock=(x:Partial<Stock>={}):Stock=>({marketplace:'Noon.sa',sku:'65',availableUnits:20,inboundUnits:0,avgDailyUnits:8,leadTimeDays:12,...x});
const now=new Date('2026-10-27T12:00:00Z');
describe('Data-quality guard',()=>{
 it('healthy reports yield full score',()=>{const q=auditReports([row()],[stock()],now);expect(q.score).toBe(100);expect(q.diagnostics).toHaveLength(0);});
 it('stale reports warn',()=>expect(auditReports([row({date:'2026-09-01'})],[stock()],now).diagnostics.some(x=>x.id==='stale_reports')).toBe(true));
 it('future dates block',()=>expect(auditReports([row({date:'2026-10-30'})],[stock()],now).blockers).toBe(1));
 it('finds duplicate campaign-day grain',()=>expect(auditReports([row(),row()],[stock()],now).diagnostics.some(x=>x.id==='duplicate_campaign_dates')).toBe(true));
 it('detects zero unit cost instead of trusting net contribution',()=>expect(auditReports([row({unitCostSar:0})],[stock()],now).diagnostics.some(x=>x.id.startsWith('missing_cost'))).toBe(true));
 it('finds attributed volume exceeding stated stock velocity',()=>expect(auditReports([row({orders:20})],[stock()],now).diagnostics.some(x=>x.id.startsWith('velocity_mismatch'))).toBe(true));
 it('suppresses false confidence for missing inventory',()=>{const q=auditReports([row()],[],now);expect(q.blockers).toBe(1);expect(q.warnings).toBeGreaterThan(0);});
});
