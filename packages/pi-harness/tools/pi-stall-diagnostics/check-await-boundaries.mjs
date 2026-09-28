import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { channel } from 'node:diagnostics_channel';
import { pathToFileURL } from 'node:url';
import { makeAwaitPublisher } from './awaits.mjs';

const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function extract(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b)}
export async function checkAwaitBoundaries(work,manifest,loggerFile){
  const {createDiagnostics}=await import(pathToFileURL(loggerFile));
  const main=manifest.targets.find(f=>f.target.endsWith('chunk-OJP47DM6.js'));
  const forward=manifest.targets.find(f=>f.target.endsWith('chunk-RCZIEVGO.js'));
  const original=fs.readFileSync(main.backup,'utf8'), patched=fs.readFileSync(main.staged,'utf8');
  const checks=[], traces={};
  for(const mode of ['baseline','disabled','enabled']){
    const text=mode==='baseline'?original:patched, dir=path.join(work,'boundaries-'+mode),diag=createDiagnostics(mode==='enabled'?dir:undefined),aw=makeAwaitPublisher(channel);
    const records=()=>fs.existsSync(dir)?fs.readdirSync(dir).flatMap(f=>fs.readFileSync(path.join(dir,f),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).sort((a,b)=>a.seq-b.seq):[];
    const snapshot=()=>{diag.awaitSnapshot();return records().at(-1)?.summary};
    const scope=vm.createContext({__sd:diag,__aw:aw,normalizeContext:x=>x,snapshotEventHandlers:x=>x});
    const handlerClass=vm.runInContext('(class {'+extract(text,'async emit(event){','async emitCacheWarmingDecision(event){')+'})',scope);
    const assistant=vm.runInContext('('+extract(text,mode==='baseline'?'async function streamAssistantResponse(':'function streamAssistantResponse(','async function failToolCallsFromTruncatedMessage(')+')',scope);
    const abortClass=vm.runInContext('(class {'+extract(text,mode==='baseline'?'async abort(){this._isAgentRunActive':'abort(){return __sd.scope(__sd.owner','async waitForIdle(){this.isIdle')+'})',scope);
    const agentMethod=mode==='baseline'?'abort(){this.activeRun?.abortController.abort()}':text.match(/abort\(\)\{const __ar=__aw.capture\(\);this.activeRun.*?"cancel.delivered"\)\}/)[0];
    const agentClass=vm.runInContext('(class {'+agentMethod+'})',scope);
    const trace=[];traces[mode]=trace;
    let number=500;
    async function run(fn){return diag.scope({request:++number,session:diag.session('fixture-session'),turn:number},async()=>{diag.awaitTrack(number);try{return await fn()}finally{diag.awaitUntrack()}})}
    for(const [kind,phase] of [['after_provider_response','handler.response'],['message_start','handler.start'],['message_update','handler.update']]){
      await run(async()=>{
        const held=gate(),ready=gate(),ctx={},event={type:kind,secret:'sentinel-secret'},h=new handlerClass();
        h.createContext=()=>ctx;h.isSessionBeforeEvent=()=>false;h.emitError=()=>trace.push('swallowed');
        h.extensions=[{ext:{path:'sentinel-secret'},handlers:[function(e,c){assert.equal(e,event);assert.equal(c,ctx);trace.push(kind);ready.resolve();return held.promise},()=>{throw new Error('sentinel-secret')}]}];
        const result=h.emit(event);queueMicrotask(()=>trace.push('microtask'));await ready.promise;
        const s=snapshot();if(mode==='enabled'){const p=s.pending.find(p=>p.phase===phase);assert(p);assert(Number.isSafeInteger(p.handler));assert(s.pending.some(d=>d.slot===p.parent&&d.phase==='handler.dispatch'))}
        held.resolve();assert.equal(await result,undefined);const settled=snapshot();if(mode==='enabled'){assert.equal(settled.pending.length,0);assert(settled.flags.includes('handler.error'))}
      });
    }
    await run(async()=>{
      const idle=gate(),controller=new AbortController(),a=new abortClass();
      a.sessionManager={sessionId:'fixture-session'};a.abortRetry=()=>trace.push('retry');a.abortCompaction=()=>trace.push('compaction');a.abortBranchSummary=()=>trace.push('summary');
      a.agent=new agentClass();a.agent.activeRun={abortController:controller};controller.signal.addEventListener('abort',()=>trace.push('controller'),{once:true});a.waitForIdle=()=>{assert(controller.signal.aborted);trace.push('idle');return idle.promise};
      const done=a.abort();queueMicrotask(()=>trace.push('abort.microtask'));await tick();
      if(mode==='enabled'){const s=snapshot();assert(s.pending.some(p=>p.phase==='cancel.idle'));assert(s.progress['cancel.retry']);assert(s.progress['cancel.compaction']);assert(s.progress['cancel.summary']);assert(s.progress['cancel.controller']);assert(s.flags.includes('signal.aborted'));assert(s.flags.includes('cancel.delivered'))}
      idle.resolve();await done;
      const failure=new Error('sentinel-secret');a.abortCompaction=()=>{throw failure};a.waitForIdle=()=>{throw new Error('must not reach idle')};
      await assert.rejects(a.abort(),e=>e===failure);
      if(mode==='enabled'){const s=snapshot();assert(s.flags.includes('cancel.error'));assert(!s.pending.some(p=>p.phase==='cancel.idle'))}
    });
    // Gate acquisition, the outer next, then the actual generic dispatch within
    // one real assistant request; inspect via a bound existing request scope.
    {
      const acquisition=gate(),acquired=gate(),nextGate=gate(),nextEntered=gate(),dispatchGate=gate(),dispatchEntered=gate();
      let inspectRequest,first=true;
      const message={role:'assistant',content:[],stopReason:'stop'},h=new handlerClass();h.createContext=()=>({});h.isSessionBeforeEvent=()=>false;h.emitError=()=>{};
      h.extensions=[{ext:{},handlers:[event=>{if(event.type==='message_start'){dispatchEntered.resolve();return dispatchGate.promise}}]}];
      const stream={ [Symbol.asyncIterator](){return{next(){if(first){first=false;nextEntered.resolve();return nextGate.promise}return Promise.resolve({done:true})}}},result:()=>Promise.resolve(message)};
      const execution=diag.scope({session:14,turn:15},()=>assistant({messages:[]},{model:{provider:'fake',api:'fake'},convertToLlm:x=>x},undefined,e=>h.emit(e),()=>{inspectRequest=diag.scopeResponse(snapshot);acquired.resolve();return acquisition.promise}));
      await acquired.promise;if(mode==='enabled')assert(inspectRequest().pending.some(p=>p.phase==='acquire'));
      acquisition.resolve(stream);await nextEntered.promise;if(mode==='enabled')assert(inspectRequest().pending.some(p=>p.phase==='assistant.next'));
      nextGate.resolve({done:false,value:{type:'start',partial:message}});await dispatchEntered.promise;
      if(mode==='enabled'){const s=inspectRequest();assert(s.pending.some(p=>p.phase==='handler.start'));assert(!s.pending.some(p=>p.phase==='assistant.next'))}
      dispatchGate.resolve();assert.equal(await execution,message);
    }
    // Actual assistant function: outer result remains pending after iterator EOF.
    const resultGate=gate(),resultEntered=gate(),message={role:'assistant',content:[],stopReason:'stop'};
    const config={model:{provider:'fake',api:'fake'},convertToLlm:x=>x};
    const events=[];
    const output={async *[Symbol.asyncIterator](){},result(){resultEntered.resolve();return resultGate.promise}};
    const done=diag.scope({session:12,turn:13},()=>assistant({messages:[]},config,undefined,e=>{events.push(e.type)},()=>output));
    queueMicrotask(()=>trace.push('assistant.microtask'));await resultEntered.promise;
    if(mode==='enabled'){
      // Sampler snapshots the isolated request even outside its ALS scope.
      await new Promise(r=>setTimeout(r,1050));
      assert(records().some(r=>r.summary?.pending.some(p=>p.phase==='assistant.result')));
    }
    resultGate.resolve(message);assert.equal(await done,message);assert.deepEqual(events,['message_start','message_end']);trace.push('assistant.settled');
    // Forwarding function from actual staged bytes, with queue EOF and result gate.
    const ft=fs.readFileSync(mode==='baseline'?forward.backup:forward.staged,'utf8');
    scope.hasResult=s=>typeof s.result==='function';
    const forwardFn=vm.runInContext('('+extract(ft,'async function forwardStream(','function lazyStream(')+')',scope);
    await run(async()=>{
      const held=gate(),ready=gate(),value={result:true},target={push(){},end(v){assert.equal(v,value);trace.push('outer.end')}};
      const source={async *[Symbol.asyncIterator](){},result(){ready.resolve();return held.promise}};
      const running=forwardFn(target,source);queueMicrotask(()=>trace.push('forward.microtask'));await ready.promise;
      if(mode==='enabled'){const s=snapshot();assert(s.pending.some(p=>p.phase==='forward.result'));assert(!s.pending.some(p=>p.phase==='forward.next'));assert(s.flags.includes('forward.eof'));assert.notEqual(s.inner,s.outer)}
      held.resolve(value);await running;
    });
    // Actual lazy setup remains pending before the forwarder exists.
    await run(async()=>{
      const setupGate=gate(),ended=gate();
      scope.AssistantMessageEventStream=class{push(){}end(){ended.resolve()}};
      scope.forwardStream=forwardFn;scope.createSetupErrorMessage=(_model,error)=>error;
      const lazy=vm.runInContext('('+extract(ft,'function lazyStream(','function lazyApi(')+')',scope);
      lazy({},()=>setupGate.promise);queueMicrotask(()=>trace.push('setup.microtask'));
      if(mode==='enabled')assert(snapshot().pending.some(p=>p.phase==='forward.setup'));
      setupGate.resolve({async *[Symbol.asyncIterator](){},result:()=>Promise.resolve({})});await ended.promise;trace.push('setup.settled');
    });
    if(mode==='enabled')assert(!JSON.stringify(records()).includes('sentinel-secret'));
  }
  assert.deepEqual(traces.disabled,traces.baseline);assert.deepEqual(traces.enabled,traces.baseline);
  checks.push('three actual generic handler kinds with gates, parent/handler IDs and swallowed failures','receiver arguments and swallowed-error behavior','actual cancellation helper order, controller signal delivery before idle, helper failure classification and original error identity','actual acquisition, outer next and generic dispatch partition','actual assistant result pending after EOF','actual forwarding setup and result pending after EOF','baseline/disabled/enabled microtask trace equality at extracted boundaries','sentinel privacy at extracted handlers');
  return{checks,traces};
}
