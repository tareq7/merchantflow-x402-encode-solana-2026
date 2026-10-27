import {describe,it,expect} from 'vitest';
import {normalizeAmazonAdvertisedProducts as convert} from '../src/domain/native-amazon';
import {analyze} from '../src/domain/engine';
const header='Start Date,End Date,Campaign Name,Advertised SKU,Impressions,Clicks,Cost,Sales (promoted),Units sold (promoted),Purchases,Currency';
const costs='sku,unit_cost_sar\nTV85,200';
const data=(row='2026-10-26,2026-10-26,SP - Test,TV85,1000,100,50,500,2,2,SAR')=>header+'\n'+row;
describe('Amazon Sponsored Products daily advertised-product normalization',()=>{
 it('maps verified Amazon column names, seller costs and attributed unit COGS',()=>{
  const result=convert(data(),costs,'sales-net-of-vat');
  expect(result.rawRows).toBe(1);
  expect(result.ads).toMatchObject([{marketplace:'Amazon.sa',campaign:'SP - Test',sku:'TV85',orders:2,unitsSold:2,revenueSar:500,spendSar:50,unitCostSar:200}]);
  expect(analyze(result.ads,[]).summary.contributionSar).toBe(50);
 });
 it('deduplicates ad-group slices at the same day SKU campaign grain',()=>{
  const rows=data()+'\n2026-10-26,2026-10-26,SP - Test,TV85,1000,100,50,300,1,1,SAR';
  const result=convert(rows,costs,'sales-net-of-vat');
  expect(result.rawRows).toBe(2);expect(result.ads).toHaveLength(1);
  expect(result.ads[0]).toMatchObject({clicks:200,orders:3,unitsSold:3,revenueSar:800});
 });
 it('VAT conversion is only applied with explicit seller selection',()=>{
  const r=convert(data(),costs,'sales-include-15pct-vat');
  expect(r.ads[0]!.revenueSar).toBe(434.78);
 });
 it('rejects multi-day summary periods rather than inventing daily evidence',()=>{
  expect(()=>convert(data('2026-10-01,2026-10-26,Campaign,TV85,1000,100,50,500,2,2,SAR'),costs,'sales-net-of-vat')).toThrow(/DAILY/);
 });
 it('rejects non-SAR instead of silently inventing FX',()=>{
  expect(()=>convert(data('2026-10-26,2026-10-26,Campaign,TV85,1000,100,50,500,2,2,USD'),costs,'sales-net-of-vat')).toThrow(/not SAR/);
 });
 it('requires private cost lookup, no default zero prices',()=>{
  expect(()=>convert(data(),'sku,unit_cost_sar\nANOTHER,100','sales-net-of-vat')).toThrow(/Missing seller-supplied/);
 });
 it('rejects missing promoted sales rather than using halo sales',()=>{
  const bad=data().replace('Sales (promoted)','Sales');
  expect(()=>convert(bad,costs,'sales-net-of-vat')).toThrow(/sales \(promoted\)/);
 });
 it('rejects rows with impossible attribution counts',()=>{
  expect(()=>convert(data('2026-10-26,2026-10-26,Campaign,TV85,10,3,50,500,2,5,SAR'),costs,'sales-net-of-vat')).toThrow(/exceed/);
 });
 it('rejects malformed unit price data and duplicate SKUs',()=>{
  expect(()=>convert(data(),'sku,unit_cost_sar\nTV85,-1','sales-net-of-vat')).toThrow();
  expect(()=>convert(data(),'sku,unit_cost_sar\nTV85,100\nTV85,200','sales-net-of-vat')).toThrow(/Duplicate/);
 });
});
