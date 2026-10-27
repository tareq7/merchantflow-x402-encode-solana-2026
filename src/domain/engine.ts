/** Deterministic marketplace financial engine. Revenue input net of VAT, currency SAR. */
export type Market='Amazon.sa'|'Noon.sa';
export type Ad={date:string;marketplace:Market;sku:string;campaign:string;impressions:number;clicks:number;orders:number;spendSar:number;revenueSar:number;unitCostSar:number;unitsSold?:number;source?:'canonical'|'amazon-advertised-product'|'noon-guided'};
export type Stock={marketplace:Market;sku:string;availableUnits:number;inboundUnits:number;avgDailyUnits:number;leadTimeDays:number};
export type Severity='critical'|'high'|'medium'|'low';
export type Kind='STOCK_PROTECT'|'PAUSE_REVIEW'|'SCALE_REVIEW'|'REPLENISH';
export type Evidence={metric:string;value:number;unit:string;formula:string};
export type Opportunity={id:string;kind:Kind;severity:Severity;score:number;marketplace:Market;sku:string;campaign:string;title:string;rationale:string;proposedAction:string;spendUnderReviewSar:number;evidence:Evidence[];confidence:'high'|'medium';status:'PROPOSED'};
export type Campaign={id:string;marketplace:Market;sku:string;campaign:string;spendSar:number;revenueSar:number;orders:number;unitsSold:number;clicks:number;impressions:number;roas:number|null;acosPct:number|null;ctrPct:number|null;cpcSar:number|null;contributionSar:number;daysOfCover:number|null;reorderPoint:number|null;availableUnits:number|null;leadTimeDays:number|null};
export type Analysis={generatedAt:string;summary:{spendSar:number;revenueSar:number;orders:number;roas:number|null;acosPct:number|null;contributionSar:number;spendUnderReviewSar:number;activeCampaigns:number;criticalAlerts:number;marketplaces:number};campaigns:Campaign[];opportunities:Opportunity[];warnings:string[]};
const rnd=(n:number,p=2)=>Number(n.toFixed(p));
const ratio=(a:number,b:number)=>b>0?rnd(a/b):null;
const sum=(nums:number[])=>nums.reduce((a,b)=>a+b,0);
const key=(r:{marketplace:Market;sku:string;campaign:string})=>r.marketplace+'|'+r.sku+'|'+r.campaign;
const oid=(kind:Kind,r:Ad)=>[kind,r.marketplace,r.sku,r.campaign].map(x=>x.replace(/[^a-zA-Z0-9]/g,'-')).join('__');
const rank:Record<Severity,number>={critical:4,high:3,medium:2,low:1};
export function analyze(ads:Ad[],stocks:Stock[],when=new Date()):Analysis {
 const warnings:string[]=['Contribution estimate excludes fees, fulfillment, returns, taxes and overhead. It is NOT net profit.','Illustrative ROAS thresholds are policies, not guaranteed campaign performance. Verify attribution and data recency.'];
 const stock=new Map(stocks.map(s=>[s.marketplace+'|'+s.sku,s]));
 const grouped=new Map<string,Ad[]>();
 for(const row of ads){const k=key(row);grouped.set(k,[...(grouped.get(k)??[]),row]);}
 const campaigns:Campaign[]=[];const opportunities:Opportunity[]=[];
 for(const rows of grouped.values()){
   const first=rows[0]!;const spendSar=rnd(sum(rows.map(x=>x.spendSar)));
   const revenueSar=rnd(sum(rows.map(x=>x.revenueSar)));
   const orders=sum(rows.map(x=>x.orders)),unitsSold=sum(rows.map(x=>x.unitsSold??x.orders)),clicks=sum(rows.map(x=>x.clicks)),impressions=sum(rows.map(x=>x.impressions));
   if(rows.some(r=>r.source==='amazon-advertised-product'))warnings.push('Amazon advertised-product report: Purchases may include halo orders. Estimated COGS use promoted SKU units, not total purchases.');
   if(rows.some(r=>r.source==='noon-guided'))warnings.push('Noon guided import: source column semantics were explicitly mapped by the seller, not independently verified as the native Noon report format.');
   if(new Set(rows.map(r=>r.unitCostSar)).size>1)warnings.push('Inconsistent unit cost for '+first.sku+'/'+first.campaign);
   const contributionSar=rnd(revenueSar-unitsSold*first.unitCostSar-spendSar);
   const s=stock.get(first.marketplace+'|'+first.sku);
   if(!s)warnings.push('Missing inventory for '+first.marketplace+' / '+first.sku+'; stock advice suppressed.');
   const cover=s&&s.avgDailyUnits>0?rnd(s.availableUnits/s.avgDailyUnits,1):null;
   const c:Campaign={id:key(first),marketplace:first.marketplace,sku:first.sku,campaign:first.campaign,spendSar,revenueSar,orders,unitsSold,clicks,impressions,roas:ratio(revenueSar,spendSar),acosPct:ratio(spendSar*100,revenueSar),ctrPct:ratio(clicks*100,impressions),cpcSar:ratio(spendSar,clicks),contributionSar,daysOfCover:cover,reorderPoint:s?rnd(s.avgDailyUnits*s.leadTimeDays):null,availableUnits:s?.availableUnits??null,leadTimeDays:s?.leadTimeDays??null};
   campaigns.push(c);
   const base={marketplace:c.marketplace,sku:c.sku,campaign:c.campaign,spendUnderReviewSar:spendSar,status:'PROPOSED' as const};
   if(s&&cover!==null&&cover<=s.leadTimeDays+3&&spendSar>0){
     const severity:Severity=s.availableUnits===0||cover<=s.leadTimeDays?'critical':'high';
     opportunities.push({...base,id:oid('STOCK_PROTECT',first),kind:'STOCK_PROTECT',severity,score:severity==='critical'?98:86,title:s.availableUnits===0?'Campaign spending against zero available stock':'High-ROAS campaign facing a stockout',rationale:`${cover} days of stock cover vs ${s.leadTimeDays}-day supplier lead time. Strong ROAS does not cancel stockout risk.`,proposedAction:'Review lowering exposure and expedite replenishment; never automatically pause or change bids.',evidence:[{metric:'days_of_cover',value:cover,unit:'days',formula:'available / average daily units'},{metric:'lead_time',value:s.leadTimeDays,unit:'days',formula:'inventory input'},{metric:'available',value:s.availableUnits,unit:'units',formula:'inventory input'},{metric:'roas',value:c.roas??0,unit:'x',formula:'revenue / spend'}],confidence:'high'});
   }else if(s&&cover!==null&&cover<s.leadTimeDays+8){
     opportunities.push({...base,id:oid('REPLENISH',first),kind:'REPLENISH',severity:'medium',score:60,title:'Tightening replenishment buffer',rationale:`${cover} days stock cover, ${s.leadTimeDays}-day replenishment lead.`,proposedAction:'Review the supplier PO and expedite stock arrival.',evidence:[{metric:'days_of_cover',value:cover,unit:'days',formula:'available / average daily units'},{metric:'lead_time',value:s.leadTimeDays,unit:'days',formula:'inventory input'}],confidence:'high'});
   }
   if(spendSar>=75&&clicks>=20&&(orders===0||(c.roas??0)<2.5)){
     opportunities.push({...base,id:oid('PAUSE_REVIEW',first),kind:'PAUSE_REVIEW',severity:orders===0?'high':'medium',score:orders===0?84:67,title:orders===0?'Significant ad spend without attributed orders':'Below-target ROAS campaign',rationale:`SAR ${spendSar.toFixed(2)} spent, ${clicks} clicks, ${orders} orders, ${c.roas??'n/a'}x ROAS.`,proposedAction:'Inspect search terms, attribution window, targeting and stock; propose negative keywords or bid adjustments only after seller approval.',evidence:[{metric:'spend',value:spendSar,unit:'SAR',formula:'campaign sum'},{metric:'clicks',value:clicks,unit:'clicks',formula:'campaign sum'},{metric:'orders',value:orders,unit:'orders',formula:'campaign sum'},{metric:'roas',value:c.roas??0,unit:'x',formula:'revenue / spend'}],confidence:clicks>=40?'high':'medium'});
   }else if((c.roas??0)>=5&&orders>=2&&s&&cover!==null&&cover>=s.leadTimeDays+10){
     opportunities.push({...base,id:oid('SCALE_REVIEW',first),kind:'SCALE_REVIEW',severity:'low',score:49,title:'Growth experiment with sufficient stock runway',rationale:`${c.roas}x ROAS, ${orders} orders, ${cover} days stock cover.`,proposedAction:'Seller-approved, limited bid test after validating fees, contribution and attribution stability.',evidence:[{metric:'roas',value:c.roas??0,unit:'x',formula:'revenue / spend'},{metric:'days_of_cover',value:cover,unit:'days',formula:'available / daily sales'},{metric:'contribution_estimate',value:contributionSar,unit:'SAR',formula:'revenue - estimated COGS - ads'}],confidence:orders>=5?'high':'medium'});
   }
 }
 opportunities.sort((a,b)=>rank[b.severity]-rank[a.severity]||b.score-a.score||a.id.localeCompare(b.id));
 const checked=new Set(opportunities.filter(o=>o.kind!=='SCALE_REVIEW').map(key));
 const spendSar=rnd(sum(campaigns.map(c=>c.spendSar))),revenueSar=rnd(sum(campaigns.map(c=>c.revenueSar)));
 return {generatedAt:when.toISOString(),campaigns,opportunities,warnings:[...new Set(warnings)],summary:{spendSar,revenueSar,orders:sum(campaigns.map(c=>c.orders)),roas:ratio(revenueSar,spendSar),acosPct:ratio(spendSar*100,revenueSar),contributionSar:rnd(sum(campaigns.map(c=>c.contributionSar))),spendUnderReviewSar:rnd(sum(campaigns.filter(c=>checked.has(key(c))).map(c=>c.spendSar))),activeCampaigns:campaigns.length,criticalAlerts:opportunities.filter(o=>o.severity==='critical').length,marketplaces:new Set(campaigns.map(c=>c.marketplace)).size}};
}
