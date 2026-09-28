import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { awaitLogger } from './awaits.mjs';
const [root, stage, output, mode, mainSet, consistent] = process.argv.slice(2);
const deny = () => { throw new Error('Offline fixture forbids network/process creation'); };
globalThis.fetch = deny;
const net = await import('node:net'), tls = await import('node:tls'), cp = await import('node:child_process');
net.default.Socket.prototype.connect = deny; tls.default.connect = deny;
(await import('node:dgram')).default.createSocket = deny;
for (const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) cp.default[k] = deny;
(await import('node:module')).syncBuiltinESMExports();
const chunks = path.join(root, 'dist/bundle/chunks'), url = f => pathToFileURL(path.join(chunks, f));
const mainFile = path.join(chunks, 'chunk-OJP47DM6.js');
const cached = await import(url('chunk-OJP47DM6.js'));
// Replace only disposable disk bytes; cached main must remain the loaded module.
if (!consistent) {
  const temporary = mainFile + '.cache-check';
  fs.copyFileSync(path.join(stage, 'chunk-OJP47DM6.js' + (mainSet === 'patched' ? '.baseline' : '.mjs')), temporary);
  fs.renameSync(temporary, mainFile);
}
assert.equal(await import(url('chunk-OJP47DM6.js')), cached);
assert.equal(await import(url('chunk-OJP47DM6.js').href + '?replacement'), cached);
const { lazyStream } = await import(url('chunk-RCZIEVGO.js'));
const { stream } = await import(url('openai-responses-HWEUZ6WZ.js'));
const model = { id:'offline', name:'offline', api:'openai-responses', provider:'offline', baseUrl:'https://offline.invalid/v1', reasoning:false, input:['text'], cost:{input:0,output:0,cacheRead:0,cacheWrite:0}, contextWindow:4096,maxTokens:64 };
const logger = path.join(path.dirname(output), 'logger-' + mode + '.mjs');
const loggerText = fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8');
fs.writeFileSync(logger, mainSet === 'patched' ? awaitLogger(loggerText) : loggerText);
const { createDiagnostics } = await import(pathToFileURL(logger));
const sd = createDiagnostics(mode === 'enabled' ? path.join(path.dirname(output), 'logs-' + path.basename(output)) : undefined);
const outcomes = [];
for (const abort of [false, true]) {
  await sd.scope({ request: abort ? 2 : 1, session:1, turn:1, awaitProvider:true }, async () => {
    sd.awaitTrack?.(1);
    try {
      let signal, callbackResolve, body;
      const callback = new Promise(resolve => { callbackResolve = resolve; });
      const controller = new AbortController(), events = [];
      const options = { apiKey:'offline', signal:controller.signal, maxRetries:0,
        fetch: async (_url, init) => {
          signal = init.signal;
          const readable = new ReadableStream({ start(c) { body = c; if (!abort) { c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[]}})+'\n\n')); c.close(); } } });
          signal.addEventListener('abort', () => { try { body.error(new DOMException('Offline abort','AbortError')); } catch {} }, { once:true });
          return new Response(readable, {status:200,headers:{'content-type':'text/event-stream'}});
        }, onResponse: function(response, receivedModel) { assert.equal(this, options); assert.equal(receivedModel, model); assert.equal(response.status,200); callbackResolve(); }
      };
      let inner, innerResult;
      const outer = lazyStream(model, async () => { inner = stream(model,{messages:[]},options); innerResult = inner.result(); return inner; });
      const consume = (async () => { for await (const event of outer) events.push(event.type); })();
      await callback; if(abort) controller.abort();
      await consume;
      const result = await outer.result(); assert.equal(result, await innerResult);
      assert.equal(result.stopReason, abort ? 'aborted' : 'stop');
      assert.deepEqual(events, ['start', abort ? 'error' : 'done']);
      if(abort) assert(signal.aborted);
      outcomes.push({abort,events,stopReason:result.stopReason,resultIdentity:true,callbackIdentity:true});
    } finally { sd.awaitUntrack?.(); }
  });
}
fs.writeFileSync(output, JSON.stringify({status:'passed',mode,mainSet,consistent:!!consistent,cachedMainUnchanged:true,networkAndProcessesBlocked:true,outcomes},null,2));
