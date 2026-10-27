import {build} from 'esbuild';
import {copyFileSync,mkdirSync,rmSync,readFileSync} from 'node:fs';
mkdirSync('api',{recursive:true});
await build({
 entryPoints:['src/adapters/vercel.ts'],
 outfile:'api/_compiled.mjs',
 bundle:true,platform:'node',target:'node24',format:'esm',minify:true,
 legalComments:'none',sourcemap:false,logLevel:'error'
});
const content=readFileSync('api/_compiled.mjs','utf8');
if(content.includes('LLM_160')||content.includes('gho_'))throw Error('Potential secret in compiled output');
for(const route of ['health','analyze','agent'])copyFileSync('api/_compiled.mjs','api/'+route+'.js');
rmSync('api/_compiled.mjs');
console.log('Three standalone Vercel functions built from the shared audited Worker.');
