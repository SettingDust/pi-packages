import fs from 'node:fs';
import path from 'node:path';
import { inspect, inspectGoogle, instrument, instrumentGoogle, sha256 } from './stage.mjs';

export const awaitRevision = 'offline-7-awaits';
export const phases = ['acquire', 'callback', 'handler.dispatch', 'handler.response', 'handler.start', 'handler.update', 'producer', 'body.next', 'body.cleanup', 'forward.setup', 'forward.next', 'forward.cleanup', 'forward.result', 'assistant.next', 'assistant.cleanup', 'assistant.result', 'cancel.retry', 'cancel.compaction', 'cancel.summary', 'cancel.controller', 'cancel.idle'];
export const flags = ['adapter.error', 'callback.error', 'handler.error', 'body.eof', 'body.error', 'response.completed', 'response.failed', 'sse.done', 'producer.error', 'inner.terminal', 'inner.end', 'forward.eof', 'forward.error', 'outer.end', 'signal.aborted', 'cancel.delivered', 'cancel.error'];

// Runs inside the existing logger; uses its sink, ALS correlation and rotation.
export function installAwaitDiagnostics(host, allowedPhases, allowedFlags) {
  const requests = new Map(), phaseSet = new Set(allowedPhases), flagSet = new Set(allowedFlags);
  let timer, subscribed = false, overflow = false, rejected = 0;
  const bridge = host.channel('pi.stall.await.v1');
  const saturate = n => Math.min(1000000, n + 1);
  const current = () => requests.get(host.context()?.request);
  function snapshot(state, reason) {
    try {
      if (!state || host.disabled()) return;
      const now = performance.now();
      const summary = { reason, request: state.request, session: state.session, turn: state.turn,
        inner: state.inner, outer: state.outer, age: Math.round(now - state.start), overflow: overflow || state.overflow,
        pending: [...state.pending.values()].map(p => ({ ...p, age: Math.round(now - p.start), start: undefined })),
        progress: { ...state.progress }, flags: [...state.flags] };
      if (Buffer.byteLength(JSON.stringify(summary)) > 16000) { state.overflow = true; return; }
      host.emit('await.snapshot', state.operation, undefined, undefined, summary);
    } catch {}
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = undefined; }
    if (subscribed) { try { bridge.unsubscribe(receive); } catch {} subscribed = false; }
  }
  function sample() {
    try {
      if (host.disabled()) { requests.clear(); stop(); return; }
      for (const state of requests.values()) snapshot(state, 'sample');
      if (rejected) host.emit('await.snapshot', undefined, undefined, undefined, {reason:'overflow',overflow:true,rejected:Math.min(rejected,1000000)});
    } catch {}
  }
  function receive(message) {
    try {
      if (host.disabled() || !message || typeof message !== 'object') return;
      if (message.action === 'capture') { const context=host.context();message.request = message.kind === 'sdk' && context?.awaitProvider !== true ? undefined : current()?.request; return; }
      const state = requests.get(message.request);
      if (!state) return;
      if (message.action === 'start' && phaseSet.has(message.phase)) {
        if (state.pending.size >= 32) { state.overflow = true; return; }
        const slot = host.next();
        const entry = { slot, phase: message.phase, start: performance.now() };
        if (Number.isSafeInteger(message.parent) && state.pending.has(message.parent)) entry.parent = message.parent;
        if (message.queue === 'inner' || message.queue === 'outer') entry.queue = state[message.queue];
        if (Number.isSafeInteger(message.handler)) entry.handler = message.handler;
        state.pending.set(slot, entry); message.slot = slot;
      } else if (message.action === 'end' && Number.isSafeInteger(message.slot)) {
        const entry = state.pending.get(message.slot);
        if (entry) {
          state.progress[entry.phase] = saturate(state.progress[entry.phase] || 0);
          state.pending.delete(message.slot);
        }
      } else if (message.action === 'flag' && flagSet.has(message.flag)) state.flags.add(message.flag);
    } catch {} // The entire owned subscriber must isolate its own failures.
  }
  function awaitTrack(operation) {
    try {
      if (host.disabled()) return;
      const ctx = host.context();
      if (!Number.isSafeInteger(ctx?.request) || requests.has(ctx.request)) return;
      if (requests.size >= 128) { overflow = true;ctx.awaitRejected=true;rejected++;return; }
      const state = { request: ctx.request, session: ctx.session, turn: ctx.turn, operation,
        inner: host.next(), outer: host.next(), start: performance.now(), pending: new Map(), progress: {}, flags: new Set(), overflow: false };
      requests.set(ctx.request, state);
      if (!subscribed) { bridge.subscribe(receive); subscribed = true; }
      if (!timer) { timer = setInterval(sample, 1000); timer.unref?.(); }
    } catch {}
  }
  function awaitUntrack() {
    try {
      const ctx=host.context();
      if(ctx?.awaitRejected){delete ctx.awaitRejected;rejected--}
      const state = current(); snapshot(state, 'settled');
      if (state) requests.delete(state.request);
      if (!requests.size && !rejected) { stop(); overflow = false; }
    } catch {}
  }
  function awaitSnapshot() { try { snapshot(current(), 'abort'); } catch {} }
  return { awaitTrack, awaitUntrack, awaitSnapshot };
}

// Publishers pass only fixed enum labels and opaque numeric metadata. They never
// wrap an awaited callback or attach a settlement observer to a promise.
export function makeAwaitPublisher(channel) {
  let bridge;
  try { bridge = channel('pi.stall.await.v1'); } catch {}
  function send(message) { try { if (bridge?.hasSubscribers) bridge.publish(message); } catch {} return message; }
  function capture(kind) { return send({ action: 'capture', kind }).request; }
  function start(phase, request, parent, queue, handler) {
    if (!Number.isSafeInteger(request)) return undefined;
    return send({ action: 'start', phase, request, parent, queue, handler }).slot;
  }
  function end(request, slot) { if (Number.isSafeInteger(slot)) send({ action: 'end', request, slot }); }
  function flag(request, flag) { if (Number.isSafeInteger(request)) send({ action: 'flag', request, flag }); }
  function iterator(source, request, phase, cleanup, queue) {
    let slot, closing;
    const step = () => { end(request, slot); slot = undefined; };
    const finish = () => { step(); end(request, closing); closing = undefined; };
    if (!Number.isSafeInteger(request)) return { source, step, finish };
    // All selected source iterators are async iterators, guarded by exact bytes.
    // next/return return the original promise; completion is observed only at
    // the existing consumer await boundary and its surrounding finally.
    const facade = { [Symbol.asyncIterator]() {
      const original = source[Symbol.asyncIterator]();
      const result = { next(...args) { slot = start(phase, request, undefined, queue); return original.next(...args); } };
      if (original.return) result.return = function(...args) { closing = start(cleanup, request, undefined, queue); return original.return(...args); };
      return result;
    } };
    return { source: facade, step, finish };
  }
  return { capture, start, end, flag, iterator };
}

const publisher = () => `import { channel as __awaitChannel } from 'node:diagnostics_channel';\nconst __aw=(${makeAwaitPublisher.toString()})(__awaitChannel);\n`;
function once(source, old, replacement, selectors) {
  if (source.split(old).length !== 2) throw new Error('Await selector missing or ambiguous: ' + old.slice(0, 70));
  selectors.push({ excerpt: old, sha256: sha256(old) });
  return source.replace(old, () => replacement);
}
function region(source, start, end, fn, selectors) {
  if (source.split(start).length !== 2 || source.split(end).length !== 2) throw new Error('Await region missing or ambiguous');
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (b <= a) throw new Error('Await region ordering');
  return once(source, source.slice(a, b), fn(source.slice(a, b)), selectors);
}
export function awaitLogger(source) {
  const selectors = [];
  source = once(source, "operation, tool: undefined }, callback)", "operation, tool: undefined, awaitProvider: true }, callback)", selectors);
  source = once(source, "scope({ google: false },", "scope({ google: false, awaitProvider: false },", selectors);
  source = once(source, "'assistant.enter',","'await.snapshot', 'assistant.enter',", selectors);
  source = once(source, 'function emit(event, operation, handler, status) {', 'function emit(event, operation, handler, status, summary) {', selectors);
  source = once(source, "const line = JSON.stringify(record) + '\\n', size = Buffer.byteLength(line);", "if (event === 'await.snapshot') record.summary = summary;\n      const line = JSON.stringify(record) + '\\n', size = Buffer.byteLength(line);", selectors);
  source = once(source, 'return { emit, id, next:', `const awaitMethods=(${installAwaitDiagnostics.toString()})({context:()=>contexts.getStore(),next:()=>++identity,emit,disabled:()=>disabled,channel:__stallChannel},${JSON.stringify(phases)},${JSON.stringify(flags)});\n  return { ...awaitMethods, emit, id, next:`, selectors);
  return source;
}
export function instrumentAwaitMain(original, logger) {
  let { source } = instrument(original, awaitLogger(logger));
  const selectors = [];
  const change = (old, replacement) => { source = once(source, old, replacement, selectors); };
  change('let __sdTerminal=false;const __sdOp=__sd.next();', 'let __sdTerminal=false;const __sdOp=__sd.next();__sd.awaitTrack(__sdOp);const __ar=__aw.capture();let __as;');
  change('__sd.emit("assistant.exit",__sdOp)', '__aw.end(__ar,__as);__sd.awaitUntrack();__sd.emit("assistant.exit",__sdOp)');
  change('response=(__sd.emit("provider.request",__sdOp),await', 'response=(__as=__aw.start("acquire",__ar),__sd.emit("provider.request",__sdOp),await');
  change('partialMessage=null,addedPartial=!1;for await(let event of response)switch(event.type)', 'partialMessage=null,addedPartial=!1;__aw.end(__ar,__as);const __ai=__aw.iterator(response,__ar,"assistant.next","assistant.cleanup","outer");try{for await(let event of __ai.source){__ai.step();switch(event.type)');
  change('finalMessage2}}let finalMessage=await response.result();', 'finalMessage2}}}}finally{__ai.finish()}let finalMessage=(__as=__aw.start("assistant.result",__ar,void 0,"outer"),await response.result());__aw.end(__ar,__as);');
  change('let finalMessage2=await response.result();', 'let finalMessage2=(__as=__aw.start("assistant.result",__ar,void 0,"outer"),await response.result());__aw.end(__ar,__as);');
  source = region(source, 'async emit(event){', 'async emitCacheWarmingDecision(event){', body => {
    const edits = [];
    body = once(body, 'let ctx=this.createContext(),result;', 'const __ar=__aw.capture(),__kind={after_provider_response:"handler.response",message_start:"handler.start",message_update:"handler.update"}[event.type],__dispatch=__kind?__aw.start("handler.dispatch",__ar):void 0;let __as;try{let ctx=this.createContext(),result;', edits);
    body = once(body, 'let handlerResult=await handler(event,ctx);', 'let handlerResult=(__as=__kind?__aw.start(__kind,__ar,__dispatch,void 0,__sd.id(handler)):void 0,await handler(event,ctx));__aw.end(__ar,__as);', edits);
    body = once(body, '}return result}', '}return result}finally{__aw.end(__ar,__dispatch)}}', edits);
    body = once(body, 'catch(err2){', 'catch(err2){__aw.flag(__ar,"handler.error");__aw.end(__ar,__as);', edits);
    return body;
  }, selectors);
  source = region(source, 'abort(){return __sd.scope(', 'async waitForIdle(){this.isIdle', body => {
    const edits = [];
    body = once(body, 'const __sdOp=__sd.next();', 'const __sdOp=__sd.next(),__ar=__aw.capture();let __as;__sd.awaitSnapshot();', edits);
    for (const [call, phase] of [['this.abortRetry()', 'cancel.retry'], ['this.abortCompaction()', 'cancel.compaction'], ['this.abortBranchSummary()', 'cancel.summary'], ['this.agent.abort()', 'cancel.controller']]) body = once(body, call, `(__as=__aw.start("${phase}",__ar),${call},__aw.end(__ar,__as))`, edits);
    body = once(body, 'await this.waitForIdle()', '(__as=__aw.start("cancel.idle",__ar),__sd.awaitSnapshot(),await this.waitForIdle(),__aw.end(__ar,__as))', edits);
    body = once(body, 'catch(__sdError){', 'catch(__sdError){__aw.flag(__ar,"cancel.error");__aw.end(__ar,__as);__sd.awaitSnapshot();', edits);
    return body;
  }, selectors);
  change('abort(){this.activeRun?.abortController.abort()}', 'abort(){const __ar=__aw.capture();this.activeRun?.abortController.abort();if(this.activeRun?.abortController.signal.aborted)__aw.flag(__ar,"signal.aborted");__aw.flag(__ar,"cancel.delivered")}');
  // The existing logger fallback also needs the three synchronous no-op methods.
  change('return {emit(){},id(){}', 'return {awaitTrack(){},awaitUntrack(){},awaitSnapshot(){},emit(){},id(){}');
  return { source: publisher() + source, selectors };
}
export function instrumentAwaitAdapter(original) {
  const selectors = []; let source = original;
  const change = (old, replacement) => { source = once(source, old, replacement, selectors); };
  change('return(async()=>{let output=', 'const __ar=__aw.capture();let __as,__failure="adapter.error";return(async()=>{let output=');
  change('if(await options?.onResponse?.(', 'if(__failure="callback.error",__as=__aw.start("callback",__ar),await options?.onResponse?.(');
  change('},model),stream2.push({type:"start"', '},model),__aw.end(__ar,__as),__failure="adapter.error",stream2.push({type:"start"');
  change('await processResponsesStream(', '__failure="producer.error",__as=__aw.start("producer",__ar),await processResponsesStream(');
  change('),options?.signal?.aborted)', '),__aw.end(__ar,__as),__failure="adapter.error",options?.signal?.aborted)');
  change('stream2.push({type:"done"', '__aw.flag(__ar,"inner.terminal"),stream2.push({type:"done"');
  change('catch(error){for(let block', 'catch(error){__aw.end(__ar,__as);__aw.flag(__ar,__failure);if(options?.signal?.aborted)__aw.flag(__ar,"signal.aborted");for(let block');
  change('stream2.push({type:"error"', '__aw.flag(__ar,"inner.terminal"),stream2.push({type:"error"');
  assertCount(source, 'stream2.end()', 2);
  source = source.replaceAll('stream2.end()', 'stream2.end(),__aw.flag(__ar,"inner.end")');
  return { source: publisher() + source, selectors };
}
function assertCount(source, value, count) { if (source.split(value).length !== count + 1) throw new Error('Unexpected selector count'); }
export function instrumentAwaitSDK(original) {
  const selectors = []; let source = original;
  const change = (old, replacement) => { source = once(source, old, replacement, selectors); };
  change('static fromSSEResponse(response,controller,client,synthesizeEventData){let consumed=', 'static fromSSEResponse(response,controller,client,synthesizeEventData){const __ar=__aw.capture("sdk");let consumed=');
  change('if(sse.data.startsWith("[DONE]")){done=!0;', 'if(sse.data.startsWith("[DONE]")){__aw.flag(__ar,"sse.done");done=!0;');
  change('if(data&&data.error)throw', 'if(data?.type==="response.completed")__aw.flag(__ar,"response.completed");if(data?.type==="response.failed")__aw.flag(__ar,"response.failed");if(data&&data.error)throw');
  change('async function*iterSSEChunks(iterator){let data=new Uint8Array;for await(let chunk of iterator){', 'async function*iterSSEChunks(iterator){const __ar=__aw.capture("sdk"),__ai=__aw.iterator(iterator,__ar,"body.next","body.cleanup","inner");let data=new Uint8Array;try{for await(let chunk of __ai.source){__ai.step();');
  change('data.length>0&&(yield data)}var SSEDecoder=', '__ai.step();__aw.flag(__ar,"body.eof");data.length>0&&(yield data)}catch(__error){__aw.flag(__ar,"body.error");throw __error}finally{__ai.finish()}}var SSEDecoder=');
  return { source: publisher() + source, selectors };
}
export function instrumentAwaitForward(original) {
  const selectors = []; let source = original;
  const change = (old, replacement) => { source = once(source, old, replacement, selectors); };
  change('async function forwardStream(target,source){for await(let event of source)target.push(event);target.end(hasResult(source)?await source.result():void 0)}', 'async function forwardStream(target,source){const __ar=__aw.capture(),__ai=__aw.iterator(source,__ar,"forward.next","forward.cleanup","inner");let __as;try{for await(let event of __ai.source){__ai.step();target.push(event)}__ai.step();__aw.flag(__ar,"forward.eof");target.end(hasResult(source)?(__as=__aw.start("forward.result",__ar,void 0,"inner"),await source.result()):void 0);__aw.end(__ar,__as);__aw.flag(__ar,"outer.end")}catch(__error){__aw.flag(__ar,"forward.error");throw __error}finally{__ai.finish();__aw.end(__ar,__as)}}');
  change('function lazyStream(model,setup){let outer=new AssistantMessageEventStream;return setup().then(inner=>forwardStream(outer,inner)).catch(error=>{', 'function lazyStream(model,setup){let outer=new AssistantMessageEventStream;const __ar=__aw.capture(),__as=__aw.start("forward.setup",__ar,void 0,"outer");return setup().then(inner=>(__aw.end(__ar,__as),forwardStream(outer,inner))).catch(error=>{__aw.end(__ar,__as);__aw.flag(__ar,"forward.error");');
  return { source: publisher() + source, selectors };
}

// SOURCE_ROOT must be the disposable original tree established by check-awaits.
// The legacy stage/installer remains on offline-6 and cannot install this set.
export function stageAwaits(root, output, incidentHashes) {
  const target = inspect(root), google = inspectGoogle(target);
  output = fs.realpathSync(output);
  if (output === target.root || output.startsWith(target.root + path.sep)) throw new Error('Await stage must be outside source');
  const sourceGuards=['chunk-WIUZI2CJ.js','chunk-A3JYRWB6.js'].map(file=>{const targetPath=fs.realpathSync(path.join(target.root,'dist/bundle/chunks',file));if(!targetPath.startsWith(target.root+path.sep)||sha256(fs.readFileSync(targetPath))!==incidentHashes[file])throw new Error('Read-only await source drift');return{target:targetPath,sha256:incidentHashes[file]}});
  const logger = fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8');
  const specs = [['chunk-OJP47DM6.js', s => instrumentAwaitMain(s, logger)], ['openai-responses-HWEUZ6WZ.js', instrumentAwaitAdapter], ['chunk-NUHFSC37.js', instrumentAwaitSDK], ['chunk-RCZIEVGO.js', instrumentAwaitForward], ['chunk-FUXEF6JQ.js', s => instrumentGoogle(s, google.citations)]];
  const targets = [];
  for (const [file, transform] of specs) {
    const sourcePath = fs.realpathSync(path.join(target.root, 'dist/bundle/chunks', file));
    if(!sourcePath.startsWith(target.root+path.sep))throw new Error('Await source escapes root');
    const original = fs.readFileSync(sourcePath);
    if (file !== 'chunk-OJP47DM6.js' && file !== 'chunk-FUXEF6JQ.js' && sha256(original) !== incidentHashes[file]) throw new Error('Await source drift');
    const patched = transform(original.toString());
    if (file === 'chunk-FUXEF6JQ.js' && sha256(patched.source) !== incidentHashes[file]) throw new Error('Google patch drift');
    const backup = path.join(output, file + '.original'), staged = path.join(output, file + '.mjs');
    fs.writeFileSync(backup, original, { flag: 'wx' }); fs.writeFileSync(staged, patched.source, { flag: 'wx' });
    if (sha256(fs.readFileSync(backup)) !== sha256(original) || sha256(fs.readFileSync(staged)) !== sha256(patched.source)) throw new Error('Await stage/backup verification failed');
    targets.push({ target: sourcePath, originalHash: sha256(original), baseHash: incidentHashes[file], patchedHash: sha256(patched.source), backup, staged, selectors: patched.selectors || patched.boundaries });
  }
  const manifest = { revision: awaitRevision, activationAllowed: false, root: target.root, version: target.version, entryHash: target.entryHash, runtimeHash: target.runtimeHash, sourceGuards, targets };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}
