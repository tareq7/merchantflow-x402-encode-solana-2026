import React,{useState} from 'react';
import {Activity,ArrowDownToLine,ArrowRight,ArrowUpRight,BarChart3,Check,CloudUpload,Database,FileText,LockKeyhole,Package,ShieldCheck,Sparkles,Target,TriangleAlert,X} from 'lucide-react';
import type {Ad,Stock,Opportunity,Analysis,Market} from './domain/engine';
import {simulateSpendChange} from './domain/simulator';
import {auditReports,type QualityReport} from './domain/data-quality';
import type {AmazonVatTreatment} from './domain/native-amazon';
export type ViewProps={
 ar:boolean;t:(en:string,arabic:string)=>string;report:Analysis;market:'All'|Market;quality:QualityReport;
 navigate:(id:'overview'|'radar'|'campaigns'|'actions'|'data'|'copilot')=>void;
 open:(x:Opportunity)=>void;approved:Opportunity[];staged:Record<string,boolean>;
 toggle:(x:Opportunity)=>void;exportApproved:()=>void;
 ads:Ad[];stocks:Stock[];source:string;loadDemo:()=>Promise<void>;
 upload:(f:File|undefined,kind:'ads'|'stocks')=>Promise<void>;
 adsInput:React.RefObject<HTMLInputElement|null>;stockInput:React.RefObject<HTMLInputElement|null>;
 importNativeAmazon:(report:File|undefined,cost:File|undefined,vat:AmazonVatTreatment)=>Promise<void>;nativeNotices:string[];
 question:string;setQuestion:(v:string)=>void;answer:string;asking:boolean;
 metaMode:boolean;setMetaMode:(v:boolean)=>void;token:string;setToken:(v:string)=>void;
 ask:(q?:string)=>Promise<void>;
};
const money=(n:number)=>'SAR '+n.toLocaleString('en-US',{maximumFractionDigits:0});
const num=(n:number|null,s='')=>n===null?'—':n.toLocaleString('en-US',{maximumFractionDigits:2})+s;
const arTitle:Record<string,string>={STOCK_PROTECT:'خطر نفاد المخزون مع استمرار الإعلان',PAUSE_REVIEW:'الإنفاق الإعلاني يحتاج إلى مراجعة',SCALE_REVIEW:'فرصة نمو بوجود مخزون كافٍ',REPLENISH:'تسريع إجراءات إعادة التوريد'};
function Pill({s}:{s:string}){return <span className={'risk '+s}><i/>{s.toUpperCase()}</span>;}
export function OpportunityCard({item,ar,t,open}:{item:Opportunity,ar:boolean;t:ViewProps['t'];open:ViewProps['open']}){
 return <article className="opp"><div className={'opp-accent '+item.severity}/><div className="opp-body">
   <div className="opp-meta"><Pill s={item.severity}/><span>{item.marketplace}</span><span className="score">#{item.score}</span></div>
   <h3>{ar?arTitle[item.kind]:item.title}</h3>
   <p>{ar?'قرار يحتاج مراجعة الأدلة والتحقق من مؤشرات المخزون والعائد الإعلاني.':item.rationale}</p>
   <div className="opp-foot"><span><Package size={15}/>{item.sku}</span><small>{item.campaign}</small><button onClick={()=>open(item)}>{t('Inspect evidence','فحص الأدلة')} <ArrowUpRight size={15}/></button></div>
  </div></article>;
}
export function InsightHeader({p}:{p:ViewProps}){return <div className="intro"><Target size={25}/><div><strong>{p.t('Prioritized by evidence, never by a black box.','أولويات مبنية على الأدلة لا على الصندوق الأسود.')}</strong><p>{p.t('Deterministic financial calculations meet advertising and stock availability. Every action stays under seller control.','الحسابات الدقيقة تربط الإعلانات بالمخزون وتبقي القرار بيد البائع.')}</p></div></div>;}
export function Dashboard(p:ViewProps){
 const {report,t,ar}=p,{summary:stats,opportunities:alerts,campaigns}=report;
 const channel=(m:Market)=>{const cs=campaigns.filter(x=>x.marketplace===m),revenue=cs.reduce((s,x)=>s+x.revenueSar,0),spend=cs.reduce((s,x)=>s+x.spendSar,0);return {revenue,spend,orders:cs.reduce((s,x)=>s+x.orders,0),roas:spend?revenue/spend:0};};
 const a=channel('Amazon.sa'),n=channel('Noon.sa');
 return <>
  <section className="hero"><div className="hero-copy"><div className="hero-label"><i className="green-dot"/> {t('CONNECTED INTELLIGENCE. HUMAN DECISIONS.','ذكاء مترابط وقرار بشري.')}</div><h2>{t('A winning ad can still','الإعلان الناجح قد')}<br/><em>{t('lose you the sale.','يُفقدك المبيعات.')}</em></h2><p>{t('Catch the moment great ROAS meets low inventory — before it costs your business sales.','اكتشف التناقض بين العائد الإعلاني الجيد ونفاد المخزون قبل خسارة المبيعات.')}</p><button onClick={()=>p.navigate('radar')}>{t('Explore priority signals','استكشف أهم الإشارات')}<ArrowRight size={18}/></button></div><div className="hero-art" aria-hidden="true"><div className="orb-ring one"/><div className="orb-ring two"/><div className="hero-core"><Activity size={40}/></div><div className="floater f1"><small>ROAS</small><strong>7.0×</strong></div><div className="floater f2"><TriangleAlert size={14}/> STOCK RISK</div><div className="floater f3"><ShieldCheck size={14}/> SELLER CONTROL</div></div></section>
  <div className="section-title"><div><h2>{t('Performance pulse','مؤشرات الأداء')}</h2><p>{t('Normalized totals · SAR · illustrative campaign period','إجماليات موحدة · ريال سعودي · فترة تجريبية')}</p></div><span className="tag">OCT 25—26, 2026</span></div>
  <div className="metrics">
   {[[t('Attributed revenue','الإيرادات المنسوبة'),money(stats.revenueSar),<ArrowUpRight size={20}/>],
     [t('Advertising spend','الإنفاق الإعلاني'),money(stats.spendSar),<Activity size={20}/>],
     [t('Blended ROAS','عائد الإعلانات'),num(stats.roas,'×'),<BarChart3 size={20}/>],
     [t('Spend under review','إنفاق قيد المراجعة'),money(stats.spendUnderReviewSar),<TriangleAlert size={20}/>]]
    .map(([label,value,icon],i)=><article key={i} className={'metric m'+i}><div><span>{label}</span>{icon}</div><strong>{value}</strong><small>{t('From sample marketplace reports','من تقارير أسواق تجريبية')}</small></article>)}
  </div>
  <div className="panel-grid">
   <article className="panel"><div className="panel-top"><div><span className="micro">MARKETPLACE MIX</span><h3>{t('Two channels. One truth.','قناتان. رؤية واحدة.')}</h3></div><span className="tag">SAR</span></div>
    {([['Amazon.sa',a],['Noon.sa',n]] as const).map(([name,info])=><div className="channel" key={name}><div className="channel-head"><strong><span className={'market-mark '+(name==='Amazon.sa'?'amazon':'noon')}>{name==='Amazon.sa'?'a':'n'}</span>{name}</strong><span>{money(info.revenue)}</span></div><div className="bar-track"><div style={{width:(info.revenue/Math.max(1,a.revenue,n.revenue)*100)+'%'}}/></div><div className="channel-bottom"><span>{info.orders} orders</span><span>{num(info.roas,'×')} ROAS</span></div></div>)}
    <p className="footnote">ⓘ {t('Contribution estimates exclude platform fees, VAT adjustments and returns.','تقديرات المساهمة لا تشمل العمولات والضرائب والمرتجعات.')}</p>
   </article>
   <article className="panel highlight"><div className="panel-top"><div><span className="micro">INTELLIGENCE BRIEF</span><h3>{t('What needs attention?','ما الذي يتطلب انتباهك؟')}</h3></div><Sparkles size={20}/></div>
    <div className="big-signal"><strong>{String(stats.criticalAlerts).padStart(2,'0')}</strong><div><b>{t('Critical signals detected','تنبيهات حرجة')}</b><p>{t('Stock-aware reasoning catches the danger behind otherwise impressive campaign ROAS.','التحليل المرتبط بالمخزون يكشف المخاطر خلف الأرقام الجيدة.')}</p></div></div>
    <div className="highlight-row"><span>{t('Evidence-backed findings','نتائج موثقة')}</span><strong>{alerts.length}</strong></div>
    <div className="highlight-row"><span>{t('Seller-controlled changes','القرارات بيد البائع')}</span><strong><ShieldCheck size={15}/> Required</strong></div>
    <button className="panel-link" onClick={()=>p.navigate('radar')}>{t('Open opportunity radar','عرض رادار الفرص')} <ArrowRight size={16}/></button>
   </article>
  </div>
  <div className="section-title"><div><h2>{t('Priority signals','أهم الإشارات')}</h2><p>{t('Every recommendation has a transparent evidence trail.','كل توصية لديها سجل أدلة شفاف.')}</p></div><button className="plain-link" onClick={()=>p.navigate('radar')}>{t('View all','عرض الكل')} <ArrowRight size={16}/></button></div>
  <div className="opps">{alerts.slice(0,3).map(o=><OpportunityCard key={o.id} item={o} ar={ar} t={t} open={p.open}/>)}</div>
 </>;
}
export function Radar(p:ViewProps){return <><InsightHeader p={p}/><div className="section-title"><h2>{p.report.opportunities.length} {p.t('signals found','إشارات مكتشفة')}</h2><span className="tag">{p.t('Risk-ranked','مرتبة حسب الخطورة')}</span></div><div className="opps">{p.report.opportunities.map(o=><OpportunityCard key={o.id} item={o} ar={p.ar} t={p.t} open={p.open}/>)}</div></>;}
export function Campaigns(p:ViewProps){return <><InsightHeader p={p}/><div className="table-wrap"><table><thead><tr>{[p.t('CAMPAIGN · SKU','الحملة والمنتج'),p.t('MARKETPLACE','السوق'),p.t('SPEND','الإنفاق'),p.t('REVENUE','الإيرادات'),'ROAS','ACoS',p.t('STOCK COVER','تغطية المخزون'),p.t('CONTRIBUTION*','مساهمة تقديرية*')].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{p.report.campaigns.map(c=><tr key={c.id}><td><strong>{c.campaign}</strong><small>{c.sku}</small></td><td>{c.marketplace}</td><td>{money(c.spendSar)}</td><td>{money(c.revenueSar)}</td><td><strong className={(c.roas??0)<2.5?'negative':'positive'}>{num(c.roas,'×')}</strong></td><td>{num(c.acosPct,'%')}</td><td><span className={c.daysOfCover!==null&&c.leadTimeDays!==null&&c.daysOfCover<c.leadTimeDays+3?'short-cover':''}>{num(c.daysOfCover,'d')}</span></td><td>{money(c.contributionSar)}</td></tr>)}</tbody></table></div><p className="footnote">* {p.t('Estimated contribution, NOT net profit. Excludes platform fees, taxes, returns and overhead.','المساهمة تقديرية وليست صافي الربح، دون العمولات والضرائب والمرتجعات.')}</p></>;}
export function Actions(p:ViewProps){const {report,t,ar,approved,staged}=p;const blocked=p.quality.blockers>0;return <>
 <div className="intro"><ShieldCheck size={25}/><div><strong>{t('Nothing is changed without you.','لا يحدث أي تغيير دون موافقتك.')}</strong><p>{t('Inspect evidence, stage proposals and export a human-readable file. No live Amazon or Noon writes.','تحقق من الأدلة، ثم اعتمد المقترحات وصدّر ملفاً. لا توجد تعديلات مباشرة على أمازون أو نون.')}</p></div></div>
 {blocked&&<div className="quality-blocked"><TriangleAlert size={18}/>{t('Resolve all blocking report-quality issues before staging or exporting a decision.','عالج أخطاء جودة البيانات المانعة قبل اعتماد أو تصدير أي قرار.')}</div>}
 <div className="action-summary"><div><small>{t('PROPOSALS','المقترحات')}</small><strong>{report.opportunities.length}</strong></div><div><small>{t('STAGED FOR EXPORT','معتمدة للتصدير')}</small><strong>{approved.length}</strong></div><button className="primary" onClick={p.exportApproved} disabled={!approved.length||blocked}><ArrowDownToLine size={16}/>{t('Export staged CSV','تصدير المقترحات')}</button></div>
 <div className="actions-list">{report.opportunities.map(o=><article key={o.id}><div><Pill s={o.severity}/><h3>{ar?arTitle[o.kind]:o.title}</h3><small>{o.marketplace} · {o.sku} · {o.campaign}</small></div><div className="action-buttons"><button className="secondary" onClick={()=>p.open(o)}>{t('Evidence','الأدلة')}</button><button disabled={blocked} className={'approval '+(staged[o.id]?'approved':'')} onClick={()=>p.toggle(o)}>{staged[o.id]?<><Check size={16}/>{t('Staged','معتمد')}</>:t('Stage proposal','اعتماد المقترح')}</button></div></article>)}</div>
 </>;}
export function DataLab(p:ViewProps){const {t,ads,stocks,source}=p;
 const [nativeReport,setNativeReport]=useState<File|undefined>();
 const [costReport,setCostReport]=useState<File|undefined>();
 const [vatChoice,setVatChoice]=useState<''|AmazonVatTreatment>('');

 const quality=auditReports(ads,stocks);
 return <>
 <div className="intro"><LockKeyhole size={25}/><div><strong>{t('Your reports stay in your browser.','تبقى تقاريرك داخل متصفحك.')}</strong><p>{t('CSV imports are parsed and analyzed locally; the files are not sent to Meta or any marketplace. Exclude personal customer information.','تُحلل ملفات CSV محلياً، دون إرسالها إلى ميتا أو المتاجر. لا تستخدم معلومات العملاء.')}</p></div></div>
 <section className="quality-audit" aria-label="Imported data quality">
   <div className="quality-heading">
    <div><span className="micro">{t('DATA TRUST MONITOR','مراقبة موثوقية البيانات')}</span><h3>{t('Know what your data can support.','اعرف مدى موثوقية بياناتك.')}</h3><p>{t('Freshness, matching inventory, cost completeness and reporting-grain checks.','الحداثة وتطابق المخزون واكتمال التكلفة وفحص تكرار السجلات.')}</p></div>
    <div className="quality-score"><strong>{quality.score}<small>/100</small></strong><span>{quality.blockers===0&&quality.warnings===0?t('Verified inputs','مدخلات سليمة'):t('Requires review','تحتاج مراجعة')}</span></div>
   </div>
   <div className="quality-foot"><span>{t('Blocking issues','أخطاء مانعة')}: <b>{quality.blockers}</b></span><span>{t('Warnings','تحذيرات')}: <b>{quality.warnings}</b></span><span>{t('Latest report','آخر تقرير')}: <b>{quality.latestReportDate??'—'}</b></span></div>
   {quality.diagnostics.length>0&&<div className="quality-findings">{quality.diagnostics.slice(0,12).map(d=><div key={d.id} className={'quality-item '+d.severity}><TriangleAlert size={16}/><div><strong>{d.title}</strong><p>{d.detail}</p></div></div>)}</div>}
  </section>
  <div className="uploads">
  <article className="upload"><div className="upload-icon"><BarChart3 size={26}/></div><span className="micro">01 · ADVERTISING</span><h3>{t('Campaign performance','أداء الحملات')}</h3><p>{t('Spend, orders, attributed revenue, and estimated item cost.','الإنفاق والطلبات والإيرادات وتكلفة البضاعة.')}</p><button className="secondary" onClick={()=>p.adsInput.current?.click()}><CloudUpload size={16}/>{t('Choose ads CSV','اختيار ملف الإعلانات')}</button><small>{ads.length} {t('records loaded','سجلاً محملاً')}</small></article>
  <article className="upload"><div className="upload-icon"><Package size={26}/></div><span className="micro">02 · INVENTORY</span><h3>{t('Stock availability','توفر المخزون')}</h3><p>{t('Available stock, inbound units, recent velocity and supplier lead time.','الكمية المتوفرة والقادمة ومعدل الطلب ومهلة التوريد.')}</p><button className="secondary" onClick={()=>p.stockInput.current?.click()}><CloudUpload size={16}/>{t('Choose stock CSV','اختيار ملف المخزون')}</button><small>{stocks.length} {t('SKUs loaded','منتجاً محملاً')}</small></article>
 </div>
 <input ref={p.adsInput} type="file" accept=".csv,text/csv" hidden onChange={e=>void p.upload(e.target.files?.[0],'ads')}/>
 <input ref={p.stockInput} type="file" accept=".csv,text/csv" hidden onChange={e=>void p.upload(e.target.files?.[0],'stocks')}/>
 <section className="native-import">
   <div className="native-head"><span className="micro">{t('AMAZON ADS · VERIFIED REPORT CONTRACT','إعلانات أمازون · صيغة معتمدة')}</span><h3>{t('Import an actual Sponsored Products report','استيراد تقرير إعلانات أمازون الفعلي')}</h3>
   <p>{t('Supports the DAILY Advertised product report, using promoted-SKU sales and units. Upload a private cost list so estimated contribution is not invented.','يدعم تقرير المنتجات المعلن عنها يومياً مع مبيعات الوحدات المروّجة؛ أرفق تكاليف المنتجات الحقيقية.')}</p></div>
   <div className="native-fields">
    <label>{t('01 · Daily Amazon Sponsored Products CSV','١ · تقرير أمازون اليومي')}
     <input type="file" accept=".csv,text/csv" onChange={e=>setNativeReport(e.target.files?.[0])}/>
     <small>{nativeReport?.name??t('Choose daily advertised-product report','اختر التقرير اليومي')}</small>
    </label>
    <label>{t('02 · Your SKU unit cost CSV','٢ · ملف تكاليف المنتجات')}
     <input type="file" accept=".csv,text/csv" onChange={e=>setCostReport(e.target.files?.[0])}/>
     <small>{costReport?.name??'sku,unit_cost_sar'}</small>
    </label>
    <label>{t('03 · Sales VAT treatment (required)','٣ · معاملة ضريبة القيمة المضافة (إلزامي)')}
     <select value={vatChoice} onChange={e=>setVatChoice(e.target.value as ''|AmazonVatTreatment)}>
      <option value="">{t('Select — do not guess','اختر — دون افتراض')}</option>
      <option value="sales-net-of-vat">{t('Sales already exclude VAT','المبيعات لا تشمل الضريبة')}</option>
      <option value="sales-include-15pct-vat">{t('Sales INCLUDE Saudi VAT (15%)','المبيعات تشمل ضريبة 15٪')}</option>
     </select>
    </label>
   </div>
   <button className="primary" disabled={!nativeReport||!costReport||!vatChoice} onClick={()=>void p.importNativeAmazon(nativeReport,costReport,vatChoice as AmazonVatTreatment)}>
    <CloudUpload size={16}/>{t('Validate and import Amazon report','التحقق واستيراد تقرير أمازون')}</button>
   <p className="native-disclaimer">{t('Daily reports only. SAR currency only. Separate stock CSV still required. Campaign attribution and actual promoted units are not interchangeable. No private files are uploaded to the server.','تقارير يومية وبالريال فقط. يلزم ملف مخزون منفصل. المشتريات المنسوبة والوحدات المروّجة ليست متطابقة. الملفات لا تغادر المتصفح.')}</p>
   {p.nativeNotices.length>0&&<div className="native-notices">{p.nativeNotices.map((notice,i)=><p key={i}><Check size={13}/>{notice}</p>)}</div>}
  </section>
  <div className="panel contract"><div><h3><FileText size={19}/>{t('Canonical CSV contracts','صيغة CSV الموحدة')}</h3><p>{t('Native Amazon/Noon exports differ; normalize them to these columns. Net revenue excludes VAT.','التقارير الأصلية لأمازون ونون تتطلب توحيد أسماء الأعمدة. الإيرادات لا تشمل ضريبة القيمة المضافة.')}</p><code>date,marketplace,sku,campaign,impressions,clicks,orders,spend_sar,revenue_sar,unit_cost_sar</code><code>marketplace,sku,available_units,inbound_units,avg_daily_units,lead_time_days</code><small>{t('Current source','مصدر البيانات')}: {source}</small></div><button className="secondary" onClick={()=>void p.loadDemo()}>{t('Restore synthetic demo','استعادة البيانات التجريبية')}</button></div>
 <div className="panel disclosures"><h3><TriangleAlert size={19}/>{t('Financial and data assumptions','افتراضات مالية وبيانات')}</h3>{p.report.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</div>
 </>;}
export function Copilot(p:ViewProps){const {t,ar,question,setQuestion,asking,answer,metaMode,setMetaMode,token,setToken,ask}=p;return <>
 <div className="copilot-hero"><div className="ai-symbol"><Sparkles size={31}/></div><div><span className="micro">META MUSE SPARK 1.3</span><h2>{t('Sharper questions. Auditable answers.','أسئلة أذكى. إجابات موثقة.')}</h2><p>{t('The free rules engine works now; live Meta API calls stay disabled until credits are confirmed and safe spending controls are configured.','محرك القواعد الحسابية مجاني؛ طلبات ميوز معطلة حتى تأكيد الرصيد وضوابط الإنفاق.')}</p></div></div>
 <div className="copilot"><div className="mode"><button className={!metaMode?'active':''} onClick={()=>setMetaMode(false)}><ShieldCheck size={17}/>{t('Verified rules · free','قواعد موثقة · مجاناً')}</button><button className={metaMode?'active':''} onClick={()=>setMetaMode(true)}><Sparkles size={17}/>Meta Muse · opt-in</button></div>
 {metaMode&&<div className="meta-alert"><TriangleAlert size={19}/><div><strong>{t('Meta API calls are disabled on the server.','اتصال ميوز معطل من الخادم.')}</strong><p>{t('After free credits appear, private API secrets and an access token are required for supervised use.','بعد إضافة الرصيد، يلزم إعداد مفاتيح خاصة ورمز وصول قبل الاستخدام.')}</p><input type="password" autoComplete="off" placeholder={t('Private access token','رمز وصول خاص')} value={token} onChange={e=>setToken(e.target.value)}/></div></div>}
 <h3>{t('Explore a decision-focused question','جرّب سؤالاً مرتبطاً بقرار')}</h3>
 <div className="suggestions">{[
 t('Which campaign might cause a stockout?','ما الحملة التي قد تسبب نفاد المخزون؟'),
 t('Where is my wasted ad spend?','أين يتم إهدار الإنفاق الإعلاني؟'),
 t('What is safe to scale?','ما فرص النمو الآمنة؟')].map(q=><button key={q} onClick={()=>void ask(q)}>{q}<ArrowUpRight size={15}/></button>)}</div>
 <div className="ask"><input aria-label="Ask SellerPilot" value={question} placeholder={t('Ask about stock, ROAS, and campaign priorities…','اسأل عن المخزون والعائد وأولويات الحملات…')} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void ask();}}/><button disabled={!question.trim()||asking} onClick={()=>void ask()}><ArrowRight size={19}/></button></div>
 {asking&&<div className="busy">{t('Analyzing verifiable evidence…','جار تحليل الأدلة…')}</div>}
 {answer&&<div className="answer"><div><ShieldCheck size={16}/>{metaMode?'MODEL STATUS':'DETERMINISTIC · ZERO PAID CALLS'}</div><p>{answer}</p></div>}
 <p className="privacy-line"><LockKeyhole size={16}/>{t('Every financial figure is computed by code. No automatic campaign writes.','تُحسب المؤشرات بالأكواد؛ لا تغييرات تلقائية للحملات.')}</p></div>
 </>;}
export function DetailDrawer({item,close,...p}:ViewProps&{item:Opportunity;close:()=>void}){
 const [change,setChange]=useState(0);
 const relatedCampaign=p.report.campaigns.find(c=>c.marketplace===item.marketplace&&c.sku===item.sku&&c.campaign===item.campaign);
 const relatedStock=p.stocks.find(st=>st.marketplace===item.marketplace&&st.sku===item.sku);
 const days=new Set(p.ads.filter(a=>a.marketplace===item.marketplace&&a.sku===item.sku&&a.campaign===item.campaign).map(a=>a.date)).size||1;
 const hypothetical=relatedCampaign?simulateSpendChange(relatedCampaign,relatedStock,days,change):null;
 return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recommendation evidence" onMouseDown={e=>{if(e.currentTarget===e.target)close();}}><aside className="detail-drawer">
 <header><span><ShieldCheck size={16}/>{p.t('AUDITABLE DECISION RECORD','سجل قرار موثّق')}</span><button aria-label="Close evidence" onClick={close}><X size={22}/></button></header>
 <Pill s={item.severity}/><h2>{p.ar?arTitle[item.kind]:item.title}</h2><p className="drawer-intro">{p.ar?'قرار يتطلب مراجعة الأدلة ومؤشرات المخزون قبل الموافقة.':item.rationale}</p>
 <div className="drawer-stats"><div><small>MARKETPLACE</small><strong>{item.marketplace}</strong></div><div><small>SKU</small><strong>{item.sku}</strong></div><div><small>CONFIDENCE</small><strong>{item.confidence}</strong></div></div>
 <h3>{p.t('Evidence & calculations','الأدلة والحسابات')}</h3>
 <div className="evidence">{item.evidence.map(e=><div key={e.metric}><small>{e.metric.replaceAll('_',' ')}</small><strong>{num(e.value)} <em>{e.unit}</em></strong><p>{e.formula}</p></div>)}</div>
 {hypothetical&&<section className="scenario">
  <header className="scenario-heading"><span className="micro"><Activity size={16}/>{p.t('WHAT-IF SENSITIVITY','تحليل الحساسية الافتراضي')}</span><strong>{change>0?'+':''}{change}%</strong></header>
  <label htmlFor="scenario-slider">{p.t('Hypothetical advertising spend change','تغير افتراضي في الإنفاق الإعلاني')}</label>
  <input id="scenario-slider" type="range" min="-30" max="30" step="5" value={change} onChange={e=>setChange(Number(e.target.value))}/>
  <div className="scenario-values">
   <div><small>{p.t('ILLUSTRATIVE SPEND','إنفاق افتراضي')}</small><strong>{money(hypothetical.illustrativeSpendSar)}</strong></div>
   <div><small>{p.t('CONSTANT-ROAS REFERENCE','إيرادات مرجعية')}</small><strong>{hypothetical.illustrativeRevenueSar===null?'—':money(hypothetical.illustrativeRevenueSar)}</strong></div>
   <div><small>{p.t('STOCK COVER UNDER STRESS','تغطية مخزون تحت الضغط')}</small><strong>{num(hypothetical.stressedDaysOfCover,' days')}</strong></div>
  </div>
  {hypothetical.stockRunwayRisk&&<p className="scenario-risk"><TriangleAlert size={15}/>{p.t('Stock cover falls inside the reported replenishment lead time.','تغطية المخزون أقل من فترة التوريد.')}</p>}
  <p className="scenario-caveat">{p.t('Illustration only: assumes unchanged ROAS, proportional attribution and no organic cannibalization. Not a forecast or recommended bid.','للتوضيح فقط: يفترض ثبات العائد ونسبة الطلبات دون قياس تأثير الطلب العضوي. ليس توقعاً أو توصية بسعر المزايدة.')}</p>
 </section>}
 <div className="proposal"><span className="micro">{p.t('PROPOSED HUMAN ACTION','إجراء مقترح للبائع')}</span><p>{p.ar?'راجع المقترح بنفسك، ولا يتم تنفيذه تلقائياً.':item.proposedAction}</p></div>
 <div className="drawer-actions"><button className="secondary" onClick={close}>{p.t('Close','إغلاق')}</button><button disabled={p.quality.blockers>0} className="approval" onClick={()=>{p.toggle(item);close();p.navigate('actions');}}>{p.staged[item.id]?p.t('Remove from staged','إلغاء الاعتماد'):p.t('Stage for export','اعتماد للتصدير')} <ArrowRight size={16}/></button></div>
 </aside></div>;}
