import type {Ad} from './engine';
import {CsvError,parseRecords} from './csv';
import type {AmazonVatTreatment} from './native-amazon';

export type GuidedMetric='date'|'campaign'|'sku'|'impressions'|'clicks'|'orders'|'unitsSold'|'spend'|'revenue';
export type NoonMapping=Record<GuidedMetric,string>&{currency?:string};
/**
 * Guided, explicit mapping for independently exported Noon Ad Manager data.
 * Not sold as a native Noon export parser: the exact version-specific
 * Ad Manager CSV headers must be verified by the seller before mapping.
 */
export const expectedNoonFields:GuidedMetric[]=['date','campaign','sku','impressions','clicks','orders','unitsSold','spend','revenue'];
const digits=(s:string,n:string,r:number,integer=false)=>{
 const text=s.trim().replace(/,/g,'');
 if(!/^\d+(\.\d{1,4})?$/.test(text))throw new CsvError('Noon row '+r+': invalid '+n);
 const value=Number(text);
 if(value>1e9||(integer&&!Number.isInteger(value)))throw new CsvError('Noon row '+r+': invalid '+n);
 return value;
};
export const headersOf=(csv:string)=>{
 const rows=parseRecords(csv);return rows[0]??[];
};
export function normalizeNoonGuided(csv:string,costsCsv:string,mapping:NoonMapping,vat:AmazonVatTreatment,confirmSar:boolean):{ads:Ad[];notices:string[]} {
 if(!confirmSar)throw new CsvError('Seller must verify the report is for Noon KSA and all monetary amounts use SAR.');
 if(!['sales-net-of-vat','sales-include-15pct-vat'].includes(vat))throw new CsvError('Choose sales VAT treatment explicitly.');
 const rows=parseRecords(csv),header=rows[0]??[];
 if(rows.length<2)throw new CsvError('Noon report needs data rows.');
 if(new Set(header).size!==header.length)throw new CsvError('Noon source has duplicate headers.');
 const chosen=expectedNoonFields.map(k=>mapping[k]);
 if(chosen.some(c=>!c))throw new CsvError('Map all nine required Noon source columns.');
 if(new Set(chosen).size!==chosen.length)throw new CsvError('Noon source: each required field must map to a DISTINCT column. Do not confuse attributed orders with promoted units.');
 for(const column of chosen)if(!header.includes(column))throw new CsvError('Noon source missing selected column '+column);
 if(mapping.currency&&!header.includes(mapping.currency))throw new CsvError('Currency mapping missing from source.');
 const costRows=parseRecords(costsCsv),costHead=costRows[0]??[];
 const skuCol=costHead.indexOf('sku'),unitCol=costHead.indexOf('unit_cost_sar');
 if(skuCol<0||unitCol<0||costRows.length<2)throw new CsvError('Cost reference requires sku,unit_cost_sar and data.');
 const cost=new Map<string,number>();
 for(let i=1;i<costRows.length;i++){
  const r=costRows[i]!,sku=r[skuCol]?.trim();
  if(!sku||cost.has(sku))throw new CsvError('Invalid or duplicate SKU in cost reference row '+(i+1));
  cost.set(sku,digits(r[unitCol]??'','SKU cost SAR',i+1));
 }
 const get=(r:string[],col:string)=>r[header.indexOf(col)]?.trim()??'';
 const pooled=new Map<string,Ad>();
 for(let i=1;i<rows.length;i++){
  const r=rows[i]!,line=i+1;if(r.length!==header.length)throw new CsvError('Noon row '+line+': unexpected number of cells.');
  const date=get(r,mapping.date),sku=get(r,mapping.sku),campaign=get(r,mapping.campaign);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new CsvError('Noon row '+line+': date must be YYYY-MM-DD and DAILY.');
  if(!sku||!campaign||sku.length>96||campaign.length>96)throw new CsvError('Noon row '+line+': invalid SKU/campaign');
  if(mapping.currency&&get(r,mapping.currency).toUpperCase()!=='SAR')throw new CsvError('Noon row '+line+': non-SAR currency.');
  const unitCost=cost.get(sku);if(unitCost===undefined)throw new CsvError('Missing seller SKU cost for '+sku);
  const impressions=digits(get(r,mapping.impressions),'impressions',line,true);
  const clicks=digits(get(r,mapping.clicks),'clicks',line,true);
  const orders=digits(get(r,mapping.orders),'orders',line,true);
  const unitsSold=digits(get(r,mapping.unitsSold),'promoted units sold',line,true);
  if(clicks>impressions||orders>clicks)throw new CsvError('Noon row '+line+': orders/clicks exceed supported report contract.');
  const spendSar=digits(get(r,mapping.spend),'SAR spend',line);
  const sales=digits(get(r,mapping.revenue),'SAR revenue',line);
  const revenueSar=vat==='sales-include-15pct-vat'?Number((sales/1.15).toFixed(2)):sales;
  const obj:Ad={date,marketplace:'Noon.sa',sku,campaign,impressions,clicks,orders,unitsSold,spendSar,revenueSar,unitCostSar:unitCost,source:'noon-guided'};
  const key=[date,sku,campaign].join('|'),old=pooled.get(key);
  if(old){old.impressions+=impressions;old.clicks+=clicks;old.orders+=orders;old.unitsSold=(old.unitsSold??0)+unitsSold;old.spendSar=Number((old.spendSar+spendSar).toFixed(2));old.revenueSar=Number((old.revenueSar+revenueSar).toFixed(2));}
  else pooled.set(key,obj);
 }
 return {ads:[...pooled.values()],notices:[
  'Guided Noon import: columns were explicitly mapped by the seller. The exact source version and definitions were not independently verified.',
  'All report money must be SAR and all rows must represent single calendar days. Campaign/SKU/day duplicates were aggregated.',
  'Orders and promoted units MUST map to distinct source fields; units and SKU unit cost determine estimated COGS.',
  'Revenue VAT treatment was explicitly selected. Verify that source revenue is SKU-attributed before acting.'
 ]};
}
