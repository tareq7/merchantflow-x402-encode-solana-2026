import {it,expect,describe} from 'vitest';
import {app} from '../src/worker';
describe('Worker API no-paid-default guardrails',()=>{
 it('health publishes disabled status',async()=>{
  const r=await app.request('http://test/api/health',{}, {ALLOW_MODEL_CALLS:'false'});
  expect(r.status).toBe(200);expect((await r.json()).mode).toBe('demo-safe');
 });
 it('model API cannot be called without explicit activation and secrets',async()=>{
  const r=await app.request('http://test/api/agent',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}, {ALLOW_MODEL_CALLS:'false'});
  expect(r.status).toBe(503);
 });
 it('rejects malformed imported analytics data',async()=>{
  const r=await app.request('http://test/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ads:[{anything:'ignored'}],stocks:[]})});
  expect(r.status).toBe(400);
 });
 it('does not expose model endpoint to anonymous users even when enabled',async()=>{
  const r=await app.request('http://test/api/agent',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}, {ALLOW_MODEL_CALLS:'true',MODEL_API_KEY:'secret',AI_ACCESS_TOKEN:'private'});
  expect(r.status).toBe(401);
 });
 it('returns verifiable metrics, not LLM output, from /api/analyze',async()=>{
  const r=await app.request('http://test/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:'{"ads":[],"stocks":[]}'});
  expect(r.status).toBe(200);expect((await r.json()).summary.roas).toBeNull();
 });
});
