import type {Ad,Market,Stock} from './engine';
export class CsvError extends Error{constructor(message:string){super(message);this.name='CsvError';}}
export function parseRecords(source:string):string[][]{
 if(source.length>600_000)throw new CsvError('CSV exceeds 600KB. Split into smaller batches.');
 const text=source.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i]!;
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
  else if(c==='"'&&!field&&!closed)quoted=true;
  else if(c===','||c==='\r'||c==='\n'){row.push(field);field='';closed=false;if(c!==','){if(row.some(x=>x.trim()))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
  else if(closed&&![' ','\t'].includes(c))throw new CsvError('Unexpected data after closing quote at byte '+i);
  else field+=c;
 }
 if(quoted)throw new CsvError('Unclosed CSV quotation.');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length>2001)throw new CsvError('CSV limit: 2000 data rows.');
 return rows;
}
const asNumber=(val:string,name:string,n:number,integer=false)=>{
 const x=val.trim();
 if(!/^\d+(\.\d{1,4})?$/.test(x))throw new CsvError(`Row ${n}: ${name} requires a nonnegative number`);
 const value=Number(x);
 if(!Number.isFinite(value)||value>1e9||(integer&&!Number.isInteger(value)))throw new CsvError(`Row ${n}: invalid ${name}`);
 return value;
};
const asMarket=(text:string):Market=>{
 const v=text.trim().toLowerCase();
 if(['amazon.sa','amazon','amazon sa'].includes(v))return 'Amazon.sa';
 if(['noon.sa','noon','noon sa'].includes(v))return 'Noon.sa';
 throw new CsvError(`Only Amazon.sa and Noon.sa supported; got "${text}"`);
};
const name=(text:string,n:number,field:string)=>{
 const v=text.trim();if(!v||v.length>96||/[<>\x00-\x1f]/.test(v))throw new CsvError(`Row ${n}: invalid ${field}`);return v;
};
function objects(text:string,required:string[],title:string):Record<string,string>[]{
 const rows=parseRecords(text);if(rows.length<2)throw new CsvError(title+': header and data required');
 const head=rows[0]!.map(h=>h.trim().toLowerCase());if(new Set(head).size!==head.length)throw new CsvError(title+': duplicate header');
 for(const h of required)if(!head.includes(h))throw new CsvError(title+': missing '+h);
 return rows.slice(1).map((row,i)=>{if(row.length!==head.length)throw new CsvError(title+` row ${i+2}: wrong field count`);return Object.fromEntries(head.map((h,n)=>[h,row[n]!.trim()]));});
}
export function parseAds(text:string):Ad[]{
 const fields=['date','marketplace','sku','campaign','impressions','clicks','orders','spend_sar','revenue_sar','unit_cost_sar'];
 return objects(text,fields,'Ads').map((r,i)=>{const n=i+2,impressions=asNumber(r.impressions!,'impressions',n,true),clicks=asNumber(r.clicks!,'clicks',n,true),orders=asNumber(r.orders!,'orders',n,true);
 if(clicks>impressions||orders>clicks)throw new CsvError(`Row ${n}: clicks cannot exceed impressions; orders cannot exceed clicks`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date!)||Number.isNaN(Date.parse(r.date!)))throw new CsvError(`Row ${n}: invalid date`);
 return {date:r.date!,marketplace:asMarket(r.marketplace!),sku:name(r.sku!,n,'sku'),campaign:name(r.campaign!,n,'campaign'),impressions,clicks,orders,spendSar:asNumber(r.spend_sar!,'spend_sar',n),revenueSar:asNumber(r.revenue_sar!,'revenue_sar',n),unitCostSar:asNumber(r.unit_cost_sar!,'unit_cost_sar',n)};
 });
}
export function parseStock(text:string):Stock[]{
 const fields=['marketplace','sku','available_units','inbound_units','avg_daily_units','lead_time_days'];
 const seen=new Set<string>();
 return objects(text,fields,'Stock').map((r,i)=>{const n=i+2,marketplace=asMarket(r.marketplace!),sku=name(r.sku!,n,'sku'),key=marketplace+'|'+sku;if(seen.has(key))throw new CsvError(`Row ${n}: duplicate stock ${key}`);seen.add(key);
 return {marketplace,sku,availableUnits:asNumber(r.available_units!,'available_units',n,true),inboundUnits:asNumber(r.inbound_units!,'inbound_units',n,true),avgDailyUnits:asNumber(r.avg_daily_units!,'avg_daily_units',n),leadTimeDays:asNumber(r.lead_time_days!,'lead_time_days',n)};
 });
}
// Spreadsheet formula injection prevention: including leading whitespace and UTF-8 BOM.
const safe=(x:unknown)=>{
 let v=String(x??'');
 if(/^[\s\uFEFF]*[=+@\-]/.test(v))v="'"+v;
 return '"'+v.replace(/"/g,'""')+'"';
};
export function toCsv<T extends object>(rows:T[],columns:(keyof T)[]):string{
 return [columns.map(safe).join(','),...rows.map(row=>columns.map(c=>safe(row[c])).join(','))].join('\r\n');
}
