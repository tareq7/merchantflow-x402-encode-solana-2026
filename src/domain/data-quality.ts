import type {Ad,Stock,Market} from './engine';
export type DiagnosticSeverity='blocker'|'warning'|'info';
export type Diagnostic={
 id:string;severity:DiagnosticSeverity;title:string;detail:string;marketplace?:Market;sku?:string;
};
export type QualityReport={
 score:number;latestReportDate:string|null;diagnostics:Diagnostic[];blockers:number;warnings:number;
 sourceRows:{ads:number;inventory:number};
};
const daysBetween=(a:Date,b:Date)=>Math.round((b.getTime()-a.getTime())/86400000);
/** Explicitly surface report contradictions rather than silently invent confidence. */
export function auditReports(ads:Ad[],stocks:Stock[],today=new Date()):QualityReport {
 const diagnostics:Diagnostic[]=[];
 const emit=(item:Diagnostic)=>diagnostics.push(item);
 const inventory=new Map(stocks.map(s=>[s.marketplace+'|'+s.sku,s]));
 const groups=new Map<string,Ad[]>();
 const keys=new Set<string>();let duplicates=0;
 for(const a of ads){
  const k=a.marketplace+'|'+a.sku;
  groups.set(k,[...(groups.get(k)??[]),a]);
  const dayKey=k+'|'+a.campaign+'|'+a.date;
  if(keys.has(dayKey))duplicates++;else keys.add(dayKey);
 }
 if(ads.length===0)emit({id:'no_ads',severity:'blocker',title:'Advertising report missing',detail:'Import an advertising dataset to generate defensible recommendations.'});
 if(stocks.length===0)emit({id:'no_inventory',severity:'blocker',title:'Inventory report missing',detail:'Without stock inputs, inventory-aware recommendations are unavailable.'});
 if(duplicates)emit({id:'duplicate_campaign_dates',severity:'warning',title:'Possible duplicate campaign-day rows',detail:'Found '+duplicates+' repeated marketplace/SKU/campaign/date keys. Verify the report grain to avoid double counting.'});
 const dates=[...new Set(ads.map(a=>a.date))].sort(),latest=dates.at(-1)??null;
 if(latest){
  const parsed=new Date(latest+'T00:00:00Z');
  const todayDay=new Date(today.toISOString().slice(0,10)+'T00:00:00Z');
  const elapsed=daysBetween(parsed,todayDay);
  if(elapsed>7)emit({id:'stale_reports',severity:'warning',title:'Advertising report may be stale',detail:'Latest campaign date '+latest+' is '+elapsed+' days old. Use recent data before changing bids.'});
  if(elapsed<0)emit({id:'future_dated',severity:'blocker',title:'Future-dated campaign rows',detail:'Campaign date '+latest+' is in the future. Verify reporting timezone and source.'});
 }
 if(dates.length>60)emit({id:'long_period',severity:'info',title:'Long reporting window',detail:'Rows span '+dates.length+' distinct reporting dates; verify stock velocity uses a comparable timeframe.'});
 for(const [sku,rows] of groups){
  const first=rows[0]!,stock=inventory.get(sku);
  if(!stock){emit({id:'stock_missing_'+sku,severity:'warning',title:'Missing inventory for advertised SKU',detail:'No matching inventory for '+first.sku+' on '+first.marketplace+'. Stock-based growth analysis is suppressed.',marketplace:first.marketplace,sku:first.sku});continue;}
  if(new Set(rows.map(r=>r.unitCostSar)).size>1)emit({id:'cost_conflict_'+sku,severity:'warning',title:'Conflicting unit costs',detail:'Unit cost changes within SKU '+first.sku+'. Contribution estimate is uncertain.',marketplace:first.marketplace,sku:first.sku});
  if(rows.some(r=>r.unitCostSar===0&&r.revenueSar>0))emit({id:'missing_cost_'+sku,severity:'warning',title:'Zero or missing product cost',detail:'Sales exist for '+first.sku+' with zero cost. Estimated contribution may be overstated.',marketplace:first.marketplace,sku:first.sku});
  const days=new Set(rows.map(r=>r.date)).size;
  const attributedOrders=rows.reduce((s,r)=>s+r.orders,0);
  const attributedDaily=days>0?attributedOrders/days:0;
  if(stock.avgDailyUnits>0&&attributedDaily>stock.avgDailyUnits*1.1){
   emit({id:'velocity_mismatch_'+sku,severity:'warning',title:'Ad orders exceed total daily velocity',detail:'Ad-attributed volume '+attributedDaily.toFixed(1)+'/day exceeds reported velocity '+stock.avgDailyUnits.toFixed(1)+'/day for '+first.sku+'. Reconcile periods and attribution.',marketplace:first.marketplace,sku:first.sku});
  }
  if(stock.avgDailyUnits===0&&attributedOrders>0)emit({id:'zero_velocity_'+sku,severity:'warning',title:'Zero velocity contradicts ad orders',detail:first.sku+' has '+attributedOrders+' attributed orders but zero reported daily units. Stock cover cannot be trusted.',marketplace:first.marketplace,sku:first.sku});
 }
 const blockers=diagnostics.filter(d=>d.severity==='blocker').length;
 const warnings=diagnostics.filter(d=>d.severity==='warning').length;
 return {score:Math.max(0,Math.min(100,100-blockers*30-warnings*9)),latestReportDate:latest,diagnostics,blockers,warnings,sourceRows:{ads:ads.length,inventory:stocks.length}};
}
