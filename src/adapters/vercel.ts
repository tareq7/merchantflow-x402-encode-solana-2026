import type { IncomingMessage, ServerResponse } from 'node:http';
import {app} from '../worker';

type VercelRequest=IncomingMessage & {body?:unknown};
type RuntimeBindings={
 MODEL_API_KEY?:string;
 AI_ACCESS_TOKEN?:string;
 ALLOW_MODEL_CALLS?:string;
};
const allowedMethods=new Set(['GET','POST','OPTIONS']);
/** Fixed upper bound: do not let one request consume arbitrary Node.js memory. */
async function readPayload(req:VercelRequest):Promise<string>{
 if(req.body!==undefined&&req.body!==null){
  const v=typeof req.body==='string'?req.body:JSON.stringify(req.body);
  if(Buffer.byteLength(v,'utf8')>500000)throw Error('payload_too_large');
  return v;
 }
 let data='';let bytes=0;
 for await(const chunk of req){
  const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
  bytes+=part.length;if(bytes>500000)throw Error('payload_too_large');
  data+=part.toString('utf8');
 }
 return data;
}
export default async function vercelBridge(req:VercelRequest,res:ServerResponse):Promise<void>{
 try{
  const method=(req.method??'GET').toUpperCase();
  if(!allowedMethods.has(method)){res.statusCode=405;res.end('method_not_allowed');return;}
  const proto=req.headers['x-forwarded-proto']==='https'?'https':'https';
  const hostname=req.headers.host??'localhost';
  const url=new URL(req.url??'/',proto+'://'+hostname);
  if(!url.pathname.startsWith('/api/')){res.statusCode=404;res.end('not_found');return;}
  const headers=new Headers();
  for(const [name,val] of Object.entries(req.headers)){
   if(!val||['host','connection','transfer-encoding','content-length'].includes(name.toLowerCase()))continue;
   headers.set(name,Array.isArray(val)?val.join(','):val);
  }
  let payload:undefined|string;
  if(!['GET','HEAD','OPTIONS'].includes(method))payload=await readPayload(req);
  const request=new Request(url,{method,headers,...(payload?{body:payload}:{})});
  const env:RuntimeBindings={
   ALLOW_MODEL_CALLS:process.env.ALLOW_MODEL_CALLS??'false',
   MODEL_API_KEY:process.env.MODEL_API_KEY,
   AI_ACCESS_TOKEN:process.env.AI_ACCESS_TOKEN
  };
  const response=await app.fetch(request,env);
  res.statusCode=response.status;
  response.headers.forEach((v,k)=>res.setHeader(k,v));
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){
  const oversized=e instanceof Error&&e.message==='payload_too_large';
  res.statusCode=oversized?413:500;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify({error:oversized?'payload_too_large':'internal_error'}));
 }
}
