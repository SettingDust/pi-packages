import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { channel } from 'node:diagnostics_channel';
import { pathToFileURL } from 'node:url';
import { makeAwaitPublisher } from './awaits.mjs';

export async function benchmarkAwaits(work,manifest,loggerFile){
  const {createDiagnostics}=await import(pathToFileURL(loggerFile));
  const sdk=manifest.targets.find(f=>f.target.endsWith('chunk-NUHFSC37.js'));
  const main=manifest.targets.find(f=>f.target.endsWith('chunk-OJP47DM6.js'));
  const report={workload:{samples:40,warmups:5,chunks:2048,handlersPerChunk:1},modes:{}};
  const chunk=new TextEncoder().encode('data: {}\n\n');
  for(const mode of ['baseline','disabled','enabled','rotation']){
    const dir=path.join(work,'cost-'+mode),diag=createDiagnostics(['enabled','rotation'].includes(mode)?dir:undefined,{maxBytes:mode==='rotation'?1400:5*1024*1024});
    const text=fs.readFileSync(mode==='baseline'?sdk.backup:sdk.staged,'utf8');
    const a=text.indexOf('async function*iterSSEChunks('),b=text.indexOf('var SSEDecoder=',a);
    const ctx=vm.createContext({__aw:makeAwaitPublisher(channel),__sd:diag,Uint8Array,ArrayBuffer,encodeUTF8:s=>new TextEncoder().encode(s),findDoubleNewlineIndex:data=>{const i=Buffer.from(data).indexOf('\n\n');return i<0?-1:i+2},snapshotEventHandlers:x=>x});
    const iterator=vm.runInContext('('+text.slice(a,b)+')',ctx);
    const mt=fs.readFileSync(mode==='baseline'?main.backup:main.staged,'utf8'),ha=mt.indexOf('async emit(event){'),hb=mt.indexOf('async emitCacheWarmingDecision(event){',ha);
    const Handler=vm.runInContext('(class {'+mt.slice(ha,hb)+'})',ctx),handler=new Handler();
    handler.createContext=()=>({});handler.isSessionBeforeEvent=()=>false;handler.emitError=()=>{};handler.extensions=[{ext:{},handlers:[()=>undefined]}];
    const times=[];let records=0,bytes=0;
    const append=fs.appendFileSync;
    fs.appendFileSync=function(file,data,...args){if(typeof file==='string'&&file.startsWith(dir+path.sep)){records++;bytes+=Buffer.byteLength(data)}return append.call(this,file,data,...args)};
    try{
      for(let sample=-5;sample<40;sample++){
        const begin=performance.now();
        await diag.scope({request:sample+10,session:1,turn:sample+10,awaitProvider:true},async()=>{
          diag.awaitTrack(sample+10);
          let count=0;
          const source={async *[Symbol.asyncIterator](){for(let i=0;i<2048;i++)yield chunk}};
          for await(const _ of iterator(source)){count++;await handler.emit({type:'message_update'})}
          assert.equal(count,2048);diag.awaitUntrack();
        });
        if(sample>=0)times.push(performance.now()-begin);
        if(sample===-1){records=0;bytes=0}
      }
    }finally{fs.appendFileSync=append}
    times.sort((a,b)=>a-b);
    report.modes[mode]={medianMs:times[20],p95Ms:times[37],elapsedMeasuredMs:times.reduce((a,b)=>a+b,0),chunksMeasured:40*2048,records,bytes,retainedBytes:fs.existsSync(dir)?fs.readdirSync(dir).reduce((n,f)=>n+fs.statSync(path.join(dir,f)).size,0):0};
    if(['enabled','rotation'].includes(mode))assert(records<=80,'Records must follow lifecycle/cadence, not chunks');
    else assert.equal(records,0);
  }
  for(const mode of ['disabled','enabled','rotation'])report.modes[mode].addedMs={median:report.modes[mode].medianMs-report.modes.baseline.medianMs,p95:report.modes[mode].p95Ms-report.modes.baseline.p95Ms};
  const snapshots={};
  for(const mode of ['disabled','enabled','rotation']){
    const diag=createDiagnostics(mode==='disabled'?undefined:path.join(work,'snapshot-cost-'+mode),{maxBytes:mode==='rotation'?1800:5*1024*1024}),times=[];
    diag.scope({request:800,session:1,turn:1},()=>{diag.awaitTrack(1);makeAwaitPublisher(channel).start('callback',800);for(let i=0;i<60;i++){const begin=performance.now();diag.awaitSnapshot();times.push(performance.now()-begin)}diag.awaitUntrack()});
    times.sort((a,b)=>a-b);snapshots[mode]={samples:60,medianMs:times[30],p95Ms:times[56]};
  }
  report.snapshotCosts=snapshots;
  report.limit='Synthetic extracted actual handler and body loops plus synchronous sink; not provider latency. No per-token writes.';
  return report;
}
