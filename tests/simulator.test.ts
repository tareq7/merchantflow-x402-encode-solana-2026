import {describe,it,expect} from 'vitest';
import {analyze,type Ad,type Stock} from '../src/domain/engine';
import {simulateSpendChange} from '../src/domain/simulator';
const ad:Ad={date:'2026-10-26',marketplace:'Amazon.sa',sku:'65',campaign:'Exact',impressions:5000,clicks:200,orders:20,spendSar:200,revenueSar:1600,unitCostSar:55};
const stock:Stock={marketplace:'Amazon.sa',sku:'65',availableUnits:100,inboundUnits:0,avgDailyUnits:10,leadTimeDays:9};
const c=analyze([ad],[stock]).campaigns[0]!;
describe('seller-controlled hypothetical scenarios',()=>{
 it('exact baseline is unchanged',()=>{const s=simulateSpendChange(c,stock,1,0);expect(s.illustrativeSpendSar).toBe(200);expect(s.currentDaysOfCover).toBe(10);expect(s.stressedDaysOfCover).toBe(10);});
 it('increasing spend stresses inventory rather than assuming increased profit',()=>{const s=simulateSpendChange(c,stock,1,25);expect(s.illustrativeSpendSar).toBe(250);expect(s.stressedDaysOfCover).toBeLessThan(s.currentDaysOfCover!);expect(s.stockRunwayRisk).toBe(true);expect(s.caveat).toContain('UNVERIFIED');});
 it('reduced spend does not falsely promise stock benefit',()=>{const s=simulateSpendChange(c,stock,1,-30);expect(s.stressedDaysOfCover).toBe(s.currentDaysOfCover);});
 it('never forecasts ROAS with no spend',()=>{const empty=analyze([{...ad,spendSar:0,revenueSar:0,orders:0}],[stock]).campaigns[0]!;expect(simulateSpendChange(empty,stock,1,20).illustrativeRevenueSar).toBeNull();});
 it('rejects scenarios outside the permitted range',()=>expect(()=>simulateSpendChange(c,stock,1,150)).toThrow());
});
