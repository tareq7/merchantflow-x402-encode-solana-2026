import {afterEach,describe,it,expect,vi} from 'vitest';
import {app} from '../src/worker';
const env={ALLOW_MODEL_CALLS:'true',MODEL_API_KEY:'local-mock-only',AI_ACCESS_TOKEN:'local-test-token'};
const ads=[{date:'2026-10-26',marketplace:'Amazon.sa',sku:'TV85',campaign:'Exact 85',impressions:1000,clicks:100,orders:8,spendSar:100,revenueSar:700,unitCostSar:100}];
const stocks=[{marketplace:'Amazon.sa',sku:'TV85',availableUnits:1,inboundUnits:0,avgDailyUnits:2,leadTimeDays:12}];
const payload=JSON.stringify({ads,stocks,question:'What is the inventory risk?',locale:'en',datasetConsent:'synthetic-only'});
const request=(authorization='Bearer local-test-token')=>app.request('https://demo.test/api/agent',{method:'POST',headers:{'content-type':'application/json',authorization},body:payload},env);
afterEach(()=>vi.unstubAllGlobals());
describe('Meta Muse tool orchestration — zero live spending',()=>{
 it('returns safe 401 before any API call when authorization is invalid',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await request('Bearer wrong')).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
 });
 it('calls documented endpoint, resolves deterministic tools and finishes',async()=>{
  const fetch=vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:null,tool_calls:[{id:'call-1',type:'function',function:{name:'get_verified_kpis',arguments:'{}'}}]}}]}),{status:200}))
    .mockResolvedValueOnce(new Response(JSON.stringify({choices:[{message:{content:'Inventory risk is critical; review the campaign before continuing spend.'}}]}),{status:200}));
  vi.stubGlobal('fetch',fetch);
  const result=await request();expect(result.status).toBe(200);
  const json=await result.json() as {model:string;toolsUsed:string[];answer:string;source:string};
  expect(json.model).toBe('muse-spark-1.3-contributor');expect(json.source).toBe('Meta Model API');
  expect(json.toolsUsed).toContain('get_verified_kpis');
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url,options]=fetch.mock.calls[0] as [string,{body:string;headers:Record<string,string>}];
  expect(url).toBe('https://api.meta.ai/v1/chat/completions');
  expect(options.headers.Authorization).toBe('Bearer local-mock-only');
  const body=JSON.parse(options.body);
  expect(body.messages[0].role).toBe('developer');
  expect(body.tools).toHaveLength(2);
  const [,second]=fetch.mock.calls[1] as [string,{body:string}];
  expect(JSON.parse(second.body).messages.some((m:{role:string;content?:string})=>m.role==='tool'&&m.content?.includes('spendSar'))).toBe(true);
 });
 it('returns generic provider failure without leaking backend information',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('bad provider',{status:429})));
  const res=await request();expect(res.status).toBe(502);
  const json=await res.json() as {error:string};
  expect(json.error).toBe('model_temporarily_unavailable');
  expect(JSON.stringify(json)).not.toContain('local-mock-only');
 });
});
