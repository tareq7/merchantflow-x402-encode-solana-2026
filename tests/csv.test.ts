import {describe,it,expect} from 'vitest';
import {parseRecords,parseAds,parseStock,CsvError,toCsv} from '../src/domain/csv';
const header='date,marketplace,sku,campaign,impressions,clicks,orders,spend_sar,revenue_sar,unit_cost_sar';
describe('Secure marketplace CSV contracts',()=>{
 it('supports BOM, quoted commas and escaped quotes',()=>expect(parseRecords('\uFEFFsku,campaign\r\n"85,flat","A ""B"""')).toEqual([['sku','campaign'],['85,flat','A "B"']]));
 it('rejects inconsistent fields',()=>expect(()=>parseAds(header+'\n2026-10-26,Amazon.sa,85')).toThrow(CsvError));
 it('rejects invalid numbers & marketplace',()=>{expect(()=>parseAds(header+'\n2026-10-26,Amazon.sa,85,A,200,10,1,-5,100,2')).toThrow('spend_sar');expect(()=>parseAds(header+'\n2026-10-26,Unknown,85,A,200,10,1,5,100,2')).toThrow('Only Amazon');});
 it('rejects duplicate inventory',()=>{const h='marketplace,sku,available_units,inbound_units,avg_daily_units,lead_time_days';expect(()=>parseStock(h+'\nNoon.sa,85,3,0,1,2\nNoon.sa,85,3,0,1,2')).toThrow('duplicate');});
 it('prevents spreadsheet formula injection',()=>{const c=toCsv([{sku:'=1+1',x:'-cmd'}],['sku','x']);expect(c).toContain('"\'=1+1"');expect(c).toContain('"\'-cmd"');});
});
