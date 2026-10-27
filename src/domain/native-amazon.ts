import type {Ad} from './engine';
import {CsvError,parseRecords} from './csv';
/**
 * Amazon Ads "Sponsored Products advertised product" daily report adapter.
 * Requires separate owner-provided unit-cost table. Stock is still imported
 * independently. Uses promoted-SKU sales and units, not halo sales, for COGS.
 * Source: https://advertising.amazon.com/help/GYNVHW8R4QPYUS9H
 */
export type AmazonVatTreatment='sales-net-of-vat'|'sales-include-15pct-vat';
export type NativeAmazonResult={ads:Ad[];notices:string[];rawRows:number};
const clean=(h:string)=>h.toLowerCase().replace(/^\uFEFF/,'').replace(/[()[\]#_%/\\\s-]+/g,'').trim();
function loadCsv(text:string,subject:string){
 const rows=parseRecords(text);
 if(rows.length<2)throw new CsvError(subject+' needs a header and data rows');
 const heads=rows[0]!.map(clean);
 if(new Set(heads).size!==heads.length)throw new CsvError(subject+': duplicate column headers');
 return {heads,rows:rows.slice(1).map((cells,i)=>{if(cells.length!==heads.length)throw new CsvError(subject+' row '+(i+2)+': wrong field count');return cells;})};
}
function get(cells:string[],heads:string[],names:string[],row:number,optional=false){
 for(const n of names){const i=heads.indexOf(clean(n));if(i>=0)return cells[i]!.trim();}
 if(optional)return '';
 throw new CsvError('Amazon report row '+row+': required column missing: '+names[0]);
}
const num=(v:string,what:string,row:number,integer=false)=>{
 const x=v.replace(/,/g,'').trim();
 if(!/^\d+(\.\d{1,4})?$/.test(x))throw new CsvError('Amazon row '+row+': invalid nonnegative '+what);
 const n=Number(x);
 if(!Number.isFinite(n)||n>1e9||(integer&&!Number.isInteger(n)))throw new CsvError('Amazon row '+row+': invalid '+what);
 return n;
};
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
const priceAliases=['sales (promoted)','7 day advertised sku sales','7 day advertised sku sales (sar)'];
const unitsAliases=['units sold (promoted)','7 day advertised sku units'];
export function normalizeAmazonAdvertisedProducts(reportText:string,costText:string,vat:AmazonVatTreatment):NativeAmazonResult {
 if(vat!=='sales-net-of-vat'&&vat!=='sales-include-15pct-vat')throw new CsvError('Choose an explicit source VAT treatment.');
 const cost=loadCsv(costText,'SKU costs'),costMap=new Map<string,number>();
 for(let i=0;i<cost.rows.length;i++){
  const row=cost.rows[i]!,id=get(row,cost.heads,['sku','advertised sku'],i+2);
  if(!id||id.length>96)throw new CsvError('Invalid cost table SKU on row '+(i+2));
  if(costMap.has(id))throw new CsvError('Duplicate cost table SKU: '+id);
  const value=get(row,cost.heads,['unit_cost_sar','unit cost sar'],i+2);
  costMap.set(id,num(value,'unit cost',i+2));
 }
 const {heads,rows}=loadCsv(reportText,'Amazon sponsored advertised-product report');
 const pooled=new Map<string,Ad>();
 let count=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i]!,line=i+2;
  const campaign=get(row,heads,['Campaign Name'],line);
  const sku=get(row,heads,['Advertised SKU'],line);
  const date=get(row,heads,['Start Date','Date'],line);
  const end=get(row,heads,['End Date'],line,true)||date;
  if(!validDate(date)||!validDate(end)||date!==end)throw new CsvError('Amazon row '+line+': choose DAILY time unit, not a multi-day summary. Found '+date+' to '+end);
  if(!campaign||campaign.length>96||!sku||sku.length>96)throw new CsvError('Amazon row '+line+': empty or invalid SKU/campaign');
  const currency=get(row,heads,['Currency'],line,true);
  if(currency&&currency.toUpperCase()!=='SAR')throw new CsvError('Amazon row '+line+': currency '+currency+' is not SAR; FX conversion is required');
  const unitCost=costMap.get(sku);
  if(unitCost===undefined)throw new CsvError('Missing seller-supplied unit cost (SAR) for SKU '+sku);
  const impressions=num(get(row,heads,['Impressions'],line),'impressions',line,true);
  const clicks=num(get(row,heads,['Clicks'],line),'clicks',line,true);
  const purchases=num(get(row,heads,['Purchases','7 Day Total Orders (#)','7 Day Total Orders'],line),'purchases',line,true);
  const promotedUnits=num(get(row,heads,unitsAliases,line),'promoted SKU units',line,true);
  const costSar=num(get(row,heads,['Cost','Spend'],line),'ad cost',line);
  const sales=num(get(row,heads,priceAliases,line),'promoted sales',line);
  if(clicks>impressions||purchases>clicks)throw new CsvError('Amazon row '+line+': clicks/purchases exceed the supported daily report contract; verify attribution');
  const revenue=vat==='sales-include-15pct-vat'?sales/1.15:sales;
  const item:Ad={
   date,marketplace:'Amazon.sa',sku,campaign,
   impressions,clicks,orders:purchases,unitsSold:promotedUnits,spendSar:Number(costSar.toFixed(2)),
   revenueSar:Number(revenue.toFixed(2)),unitCostSar:unitCost,source:'amazon-advertised-product'
  };
  const id=[date,sku,campaign].join('|'),prev=pooled.get(id);
  if(prev){
   prev.impressions+=item.impressions;prev.clicks+=item.clicks;prev.orders+=item.orders;
   prev.unitsSold=(prev.unitsSold??0)+(item.unitsSold??0);
   prev.spendSar=Number((prev.spendSar+item.spendSar).toFixed(2));
   prev.revenueSar=Number((prev.revenueSar+item.revenueSar).toFixed(2));
  }else pooled.set(id,item);
  count++;
 }
 return {ads:[...pooled.values()],rawRows:count,notices:[
  'Imported DAILY Amazon Sponsored Products advertised-product report. Rows are aggregated by date/campaign/advertised SKU across ad groups.',
  'For estimated COGS, SellerPilot uses Units sold (promoted); Purchases may include other SKU/halo purchases, and must not be treated as exact promoted-unit count.',
  'Promo sales are read using Sales (promoted), not total cross-SKU sales. VAT treatment was explicitly selected by the seller.',
  'Unit costs come only from the uploaded private SKU cost sheet. Marketplace fees and fulfillment are not modeled.',
  'Do not combine summary and daily reports, different attribution windows, or different account currencies.'
 ]};
}
