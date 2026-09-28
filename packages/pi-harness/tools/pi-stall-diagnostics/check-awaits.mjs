import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect, inspectGoogle, instrument, instrumentGoogle, sha256 } from './stage.mjs';

import vm from 'node:vm';
import { channel } from 'node:diagnostics_channel';
import { stageAwaits, makeAwaitPublisher } from './awaits.mjs';
import { smoke } from './smoke.mjs';
import { runAwaitChecks } from './check-await-runtime.mjs';
import { checkAwaitBoundaries } from './check-await-boundaries.mjs';
import { benchmarkAwaits } from './check-await-cost.mjs';
import { apply } from './install.mjs';

// Persist bounded implementation and acceptance units incrementally.
const hashes = {
  'chunk-OJP47DM6.js': 'b1c6995246bb393df5fda23dc3a286f7d8f26814a09fc2aa140760ba78207d3c',
  'openai-responses-HWEUZ6WZ.js': '4ebfa8cec003119c431c92b8306f28f5b9359bde82e213bc8afa6ed764d5bde8',
  'chunk-NUHFSC37.js': '9b724435ac1da15eaa4465e7eaca0aa9a23617c6f1efa7b6261db6d17dbe755b',
  'chunk-WIUZI2CJ.js': 'a85d542043c502be8f1c204929762774b5373fae0f3a21b918bf2df151a1edb8',
  'chunk-A3JYRWB6.js': '39a18bfbaf6a8edd098844da7988e1ff4a5551520e47c4aacbfc95e7c669a843',
  'chunk-RCZIEVGO.js': '7b2c0b36b01c1cedb11e7ab525a3fade0967f56b0cbd286fc32ffa25f5965055',
  'chunk-FUXEF6JQ.js': '32b6ff866b6a64fc2613fa12474f7ada5ca1483a362d0be7680735bdaedc1200'
};
const chunkDir = root => path.join(root, 'dist/bundle/chunks');
const fixtureProvenance = {
  directory: 'C:/Users/WINDOWS/AppData/Local/Temp/pi-responses-settlement-J904TM',
  sha256: { 'probe.mjs': '659e8a166a71b14ef7760a607cfa89e115788fadcba36d93c2f6fbb8997456ce',
    'result.json': '9650414b1104109610f499b3ac0f2add010668aca4e10ceb55d11c156229bfdf',
    'sources.json': 'de383f4e83ed315c602f0b140034ba3b39dd033177e21777949bd4cedccabaf9' },
  changes: ['repository-owned runner; no Temp fixture dependency', 'explicit callback/body-pull gates', 'bounded cleanup with cleared timers', 'isolated disposable source and home', 'network/process blockers', 'incremental sanitized evidence']
};
const readHashes = root => Object.fromEntries(Object.keys(hashes).map(file => [file, sha256(fs.readFileSync(path.join(chunkDir(root), file)))]));
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

async function baseline(root, output, mode = 'baseline', loggerModule) {
  const deny = () => { throw new Error('Offline fixture forbids network/process creation'); };
  globalThis.fetch = deny;
  const net = await import('node:net'), tls = await import('node:tls'), cp = await import('node:child_process');
  net.default.Socket.prototype.connect = deny;
  tls.default.connect = deny;
  for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) cp.default[name] = deny;
  (await import('node:module')).syncBuiltinESMExports();
  const { stream } = await import(pathToFileURL(path.join(chunkDir(root), 'openai-responses-HWEUZ6WZ.js')));
  const { AssistantMessageEventStream } = await import(pathToFileURL(path.join(chunkDir(root), 'chunk-A3JYRWB6.js')));
  const model = { id: 'offline', name: 'offline', api: 'openai-responses', provider: 'offline', baseUrl: 'https://offline.invalid/v1', reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 64 };
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const frame = obj => new TextEncoder().encode('data: ' + (typeof obj === 'string' ? obj : JSON.stringify(obj)) + '\n\n');
  const bounded = async (promise, label) => {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), 2000); })]); }
    finally { clearTimeout(timer); }
  };
  let diagnostics;
  const logDirectory = path.join(path.dirname(output), mode + '-logs');
  if (loggerModule) {
    const { createDiagnostics } = await import(pathToFileURL(loggerModule));
    diagnostics = createDiagnostics(mode.startsWith('enabled') ? logDirectory : undefined);
  }
  const mainText=fs.readFileSync(path.join(chunkDir(root),'chunk-OJP47DM6.js'),'utf8');
  const abortStart=mainText.indexOf(mode==='baseline'?'async abort(){this._isAgentRunActive':'abort(){return __sd.scope(__sd.owner'),abortEnd=mainText.indexOf('async waitForIdle(){this.isIdle',abortStart);
  assert(abortStart>=0&&abortEnd>abortStart);
  const SessionAbort=vm.runInNewContext('(class {'+mainText.slice(abortStart,abortEnd)+'})',{__sd:diagnostics,__aw:makeAwaitPublisher(channel)});
  const snapshots = () => fs.existsSync(logDirectory) ? fs.readdirSync(logDirectory).filter(f => f.endsWith('.jsonl')).flatMap(f => fs.readFileSync(path.join(logDirectory, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).filter(r => r.event === 'await.snapshot') : [];
  const reports = [];
  let requestIdentity = 0;
  const report = { status: 'running', scope: mode, runtime: { bun: process.versions.bun, node: process.versions.node }, cases: reports };
  save(output, report);
  async function runCase(name, { initial, close = false, bodyError = false, cooperative = true, callbackGate = false, callbackError = false, cleanupGate = false, expectPending = false, abort = false }) {
    let body, transportSignal, releaseCallback, callbackReached, firstPullReached, cleanupReached;
    const cleanupReady = new Promise(resolve => { cleanupReached = resolve; });
    const gate = new Promise(resolve => { releaseCallback = resolve; });
    const callback = new Promise(resolve => { callbackReached = resolve; });
    const firstPull = new Promise(resolve => { firstPullReached = resolve; });
    const signal = new AbortController();
    let result, abortPromise, iterationEnded = false, requests = 0, callbackReleased = !callbackGate, bodyClosed = close;
    const events = [], trace = [];
    const fakeFetch = async (_url, options) => {
      trace.push('fetch');queueMicrotask(()=>trace.push('fetch.microtask'));
      requests++; transportSignal = options.signal;
      const readable = new ReadableStream({
        start(controller) { body = controller; if (initial !== undefined) controller.enqueue(frame(initial)); if (close) controller.close(); },
        pull() { firstPullReached(); },
        cancel() { cleanupReached(); return cleanupGate ? gate : undefined; }
      }, { highWaterMark: 0 });
      if (mode.endsWith('fallback')) Object.defineProperty(readable, Symbol.asyncIterator, { value: undefined });
      else assert.equal(typeof readable[Symbol.asyncIterator], 'function', 'Native async iterator branch available');
      if (cooperative) transportSignal.addEventListener('abort', () => { try { body.error(new DOMException('Offline abort', 'AbortError')); } catch {} }, { once: true });
      return new Response(readable, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    };
    const options = { apiKey: 'offline-placeholder', fetch: fakeFetch, signal: signal.signal, maxRetries: 0, timeoutMs: 10,
      onResponse: function(response, receivedModel) { assert.equal(this, options); assert.equal(response.status, 200); assert.equal(receivedModel, model); trace.push('callback');queueMicrotask(()=>trace.push('callback.microtask'));callbackReached(); if(callbackError)throw new Error('PRIVATE_CALLBACK_SENTINEL');return callbackGate ? gate : undefined; } };
    const outputStream = stream(model, { messages: [] }, options);
    const resultPromise = outputStream.result().then(value => { result = value; return value; });
    const consumer = (async () => { for await (const event of outputStream) {events.push(event.type);trace.push(event.type);queueMicrotask(()=>trace.push(event.type+'.microtask'))} iterationEnded = true;trace.push('iteration.end'); })();
    try {
      await bounded(callback, 'Callback not reached');
      if (bodyError) body.error(new Error('Offline interrupted body'));
      if (cleanupGate) await bounded(cleanupReady, 'Iterator cleanup not reached');
      if (!callbackError && !cleanupGate && !close && !bodyError && !callbackGate && name !== 'response_failed_open_body') await bounded(firstPull, 'Body pull not reached');
      await tick();
      const beforeAbort = { resultSettled: !!result, iterationEnded, transportAborted: transportSignal.aborted, events: [...events] };
      if (abort) {
        if(name==='abort_noncooperative_body'){
          const session=new SessionAbort();session.sessionManager={sessionId:'fixture'};
          session.abortRetry=()=>{};session.abortCompaction=()=>{};session.abortBranchSummary=()=>{};
          session.agent={abort(){signal.abort()}};
          session.waitForIdle=()=>{assert(transportSignal.aborted);assert(!result);return consumer};
          abortPromise=session.abort();
        }else signal.abort();
      }
      if (!expectPending) await bounded(Promise.all([consumer, resultPromise]), 'Expected settlement not reached');
      else { await tick(); await tick(); }
      const observed = { resultSettled: !!result, iterationEnded, transportAborted: transportSignal.aborted, stopReason: result?.stopReason, events: [...events] };
      diagnostics?.awaitSnapshot();
      const pending = snapshots().at(-1)?.summary;
      if(mode.startsWith('enabled'))assert.equal(pending.request,makeAwaitPublisher(channel).capture(),'Snapshot remains on originating request');
      if (mode.startsWith('enabled') && expectPending) {
        assert(pending.pending.some(p => p.phase === (callbackGate ? 'callback' : cleanupGate ? 'body.cleanup' : 'body.next')), name + ': pending partition');
        if(name==='abort_noncooperative_body')assert(pending.pending.some(p=>p.phase==='cancel.idle'));
        assert(!pending.flags.includes('inner.end'), name + ': no false completion');
        assert(pending.pending.some(p=>p.phase===(callbackGate?'callback':'producer')));
        if (name === 'completed_body_left_open') assert(pending.flags.includes('response.completed'));
        if (name === 'DONE_body_left_open') assert(pending.flags.includes('sse.done'));
      }
      assert.equal(!result, expectPending, name + ': settlement expectation');
      assert.equal(iterationEnded, !expectPending, name + ': iterator expectation');
      assert.equal(requests, 1, name + ': no retry');
      if (abort) assert(transportSignal.aborted, name + ': cancellation reaches transport');
      if (expectPending) {
        assert(callbackGate ? !callbackReleased : !bodyClosed, name + ': controlled gate still closed');
        releaseCallback(); callbackReleased = true;
        try { body.close(); bodyClosed = true; } catch {}
      }
      await bounded(Promise.all([consumer, resultPromise, abortPromise]), 'Fixture cleanup did not settle');
      const expectedReason = abort ? 'aborted' : name.startsWith('completed_') ? 'stop' : 'error';
      assert.equal(result.stopReason, expectedReason, name + ': original stop reason');
      assert.deepEqual(events, callbackError ? ['error'] : cleanupGate ? ['start', 'error'] : ['start', expectedReason === 'stop' ? 'done' : 'error'], name + ': original event order');
      reports.push({ name, beforeAbort, observed, cleanupStopReason: result?.stopReason, requests, trace,
        controlledGate: expectPending ? (callbackGate ? 'callback' : cleanupGate ? 'body cleanup' : 'body EOF') : null,
        ...(mode.startsWith('enabled') ? { snapshot: pending } : {}) });
      save(output, report);
    } finally {
      releaseCallback();
      try { body?.close(); } catch {}
    }
  }
  function run(name, options) {
    const action = async () => { diagnostics?.awaitTrack(1); try { return await runCase(name, options); } finally { diagnostics?.awaitUntrack(); } };
    return diagnostics ? diagnostics.scope({ request: ++requestIdentity, session: diagnostics.session('fixture'), turn: name.includes('concurrent') ? 99 : requestIdentity, awaitProvider: true }, action) : action();
  }
  await run('EOF_without_terminal', { close: true });
  await run('body_read_rejects', { bodyError: true });
  await run('response_failed_open_body', { initial: { type: 'response.failed', response: { status: 'failed', error: { code: 'offline', message: 'Offline failure' } } } });
  await run('completed_and_EOF', { initial: { type: 'response.completed', response: { status: 'completed', output: [] } }, close: true });
  await run('completed_body_left_open', { initial: { type: 'response.completed', response: { status: 'completed', output: [] } }, expectPending: true });
  await run('DONE_body_left_open', { initial: '[DONE]', expectPending: true });
  await run('abort_cooperative_body', { abort: true });
  await run('abort_noncooperative_body', { abort: true, cooperative: false, expectPending: true });
  await run('abort_during_onResponse', { abort: true, callbackGate: true, expectPending: true });
  await run('callback_throws', { callbackError: true });
  await run('response_failed_cleanup_gate', { initial: { type: 'response.failed', response: { status: 'failed', error: { code: 'offline', message: 'Offline failure' } } }, cleanupGate: true, expectPending: true });
  const completeFrame={type:'response.completed',response:{status:'completed',output:[]}};
  await Promise.all([run('completed_concurrent_A',{initial:completeFrame,close:true}),run('completed_concurrent_B',{initial:completeFrame,close:true})]);
  const queue = new AssistantMessageEventStream();
  let queueResult = false;
  const queuePromise = queue.result().then(() => { queueResult = true; });
  queue.end(); assert((await queue[Symbol.asyncIterator]().next()).done);
  await tick(); assert.equal(queueResult, false);
  queue.end({ stopReason: 'error' }); await bounded(queuePromise, 'Queue cleanup not settled'); assert(queueResult);
  reports.push({ name: 'bare_queue_end_without_result', iterationEnds: true, resultPendingUntilExplicitResult: true, adapterUsesTerminalPushBeforeEnd: true });
  assert(snapshots().filter(r=>r.summary.reason==='settled').every(r=>r.summary.pending.length===0),'Settled adapter request retains no pending phases');
  assert(!JSON.stringify(snapshots()).includes('PRIVATE_CALLBACK_SENTINEL'));
  report.status = 'passed'; save(output, report);
}

async function preflight(root, evidenceFile) {
  assert(process.versions.bun, 'Run with Bun to verify actual runtime semantics');
  evidenceFile = path.resolve(evidenceFile);
  const canonical = fs.realpathSync(root);
  const current = fs.realpathSync('D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent');
  assert.equal(canonical, current, 'Current mapping drift');
  assert.equal(canonical, fs.realpathSync('D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent'));
  assert(!evidenceFile.startsWith(canonical + path.sep), 'Evidence must be outside installation');
  const before = readHashes(canonical); assert.deepEqual(before, hashes);
  const live = inspect(canonical, hashes['chunk-OJP47DM6.js']);
  const recovery = 'C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1';
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(recovery, 'manifest.json'), 'utf8')); }
  catch { throw new Error('Recovery manifest missing or invalid'); }
  assert.equal(manifest.revision, 'offline-6-google'); assert.equal(manifest.targets.length, 2);
  assert.equal(live.entryHash, manifest.entryHash); assert.equal(live.runtimeHash, manifest.runtimeHash);
  const backups = manifest.targets.map((file, i) => {
    assert.equal(fs.realpathSync(file.target), fs.realpathSync(path.join(chunkDir(canonical), i ? 'chunk-FUXEF6JQ.js' : 'chunk-OJP47DM6.js')));
    assert.equal(fs.realpathSync(file.backup), fs.realpathSync(path.join(recovery, i ? 'google-original.js' : 'original.js')));
    const bytes = fs.readFileSync(file.backup);
    assert.equal(sha256(bytes), file.originalHash);
    assert.equal(sha256(fs.readFileSync(file.staged)), file.patchedHash);
    assert.equal(sha256(fs.readFileSync(file.target)), file.patchedHash);
    return bytes;
  });
  assert.equal(sha256(backups[0]), '81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020');
  assert.equal(sha256(backups[1]), 'b7d0697d0f4c7d3b54c6aee545d3b27c5981c27d0470e1c79876898f28f2c472');
  const selectors = [];
  for (const [file, excerpts] of Object.entries({
    'chunk-OJP47DM6.js': ['async emit(event){', 'async emitCacheWarmingDecision(event){', 'async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage(', 'async abort(){this._isAgentRunActive', 'async waitForIdle(){this.isIdle', 'abort(){this.activeRun?.abortController.abort()}'],
    'openai-responses-HWEUZ6WZ.js': ['await options?.onResponse?.(', 'await processResponsesStream('],
    'chunk-NUHFSC37.js': ['static fromSSEResponse(', 'async function*_iterSSEMessages(', 'async function*iterSSEChunks(', 'function ReadableStreamToAsyncIterable('],
    'chunk-RCZIEVGO.js': ['async function forwardStream(target,source)', 'function lazyStream(model,setup)']
  })) {
    const source = (file === 'chunk-OJP47DM6.js' ? backups[0] : fs.readFileSync(path.join(chunkDir(canonical), file))).toString();
    for (const excerpt of excerpts) {
      assert.equal(source.split(excerpt).length, 2, 'Missing or ambiguous source selector');
      selectors.push({ file, sourceHash: sha256(source), excerpt, sha256: sha256(excerpt) });
    }
  }
  const reproduced = instrument(backups[0].toString(), fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8'));
  assert.equal(sha256(reproduced.source), hashes['chunk-OJP47DM6.js']);
  const work = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pi-stall-pair-awaits-'));
  const report = { status: 'partial', t3Complete: false, activationAllowed: false, observedAt: new Date().toISOString(),
    scope: 'offline-7-awaits four-file diagnostics, five-target staging and focused acceptance', runtime: { bun: process.versions.bun, node: process.versions.node },
    command: ['bun', 'packages/pi-harness/tools/pi-stall-diagnostics/check-awaits.mjs', root, evidenceFile],
    kitHashes: Object.fromEntries(['check-awaits.mjs', 'awaits.mjs', 'check-await-runtime.mjs', 'check-await-boundaries.mjs', 'check-await-cost.mjs', 'stage.mjs', 'logger.mjs', 'install.mjs', 'smoke.mjs'].map(file => [file, sha256(fs.readFileSync(new URL(file, import.meta.url)))])),
    root: canonical, work, fixtureProvenance, selectors, sourceHashes: before, originalHashes: backups.map(sha256), reproducedMainHash: sha256(reproduced.source),
    checks: ['canonical current mapping', 'seven incident file hashes', 'entry/runtime guards', 'verified original recovery pair', 'exact old main patch reproduction'],
    missing: ['outstanding-await instrumentation and expanded staging', 'baseline/disabled/enabled diagnostic comparisons', 'generic handler/cancellation/correlation checks', 'snapshot caps/privacy/failure isolation/timer checks', 'performance and rotation measurements', 'five-target syntax/import/CLI smoke and installer-refusal checks'] };
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true }); save(evidenceFile, report);
  try {
    const fixture = path.join(work, 'fixture');
    fs.cpSync(canonical, fixture, { recursive: true });
    fs.symlinkSync(path.dirname(path.dirname(canonical)), path.join(work, 'node_modules'), 'junction');
    for (const [i, file] of manifest.targets.entries()) fs.writeFileSync(path.join(fixture, path.relative(canonical, file.target)), backups[i]);
    const original = inspect(fixture), google = inspectGoogle(original);
    const sdk = instrumentGoogle(google.bytes.toString(), google.citations);
    assert.equal(sha256(sdk.source), hashes['chunk-FUXEF6JQ.js']);
    report.reproducedGoogleHash = sha256(sdk.source);
    report.checks.push('restored disposable source only', 'original Google mappings/selectors', 'exact unchanged Google patch reproduction');
    save(evidenceFile, report);
    const home = path.join(work, 'home'); fs.mkdirSync(home);
    const output = path.join(work, 'baseline.json');
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--baseline', fixture, output], {
      cwd: home, encoding: 'utf8', timeout: 20000,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: work, TMP: work, HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home, PI_CODING_AGENT_DIR: path.join(home, 'agent'), BUN_INSTALL_CACHE_DIR: path.join(work, 'bun-cache'), BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(work, 'bun-transpiler'), NO_COLOR: '1' }
    });
    // Never persist arbitrary child stdout/stderr or exception messages.
    report.baselineExitCode = child.status;
    if (fs.existsSync(output)) report.baseline = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(child.status, 0, 'Baseline child failed; inspect disposable output');
    assert.equal(report.baseline.status, 'passed'); assert.equal(report.baseline.cases.length, 14);
    assert.deepEqual(fs.readdirSync(home), [], 'Fixture created user state');
    report.checks.push('ten retained baseline fixtures plus callback rejection, gated cleanup and two concurrent requests under Bun', 'isolated empty home');
    save(evidenceFile, report);
    const stageDirectory=path.join(work,'stage');fs.mkdirSync(stageDirectory);
    save(path.join(work,'disposable.json'),{root:fixture,directory:stageDirectory,source:canonical});
    const staged=stageAwaits(fixture,stageDirectory,hashes);report.awaitManifest=staged;
    save(evidenceFile,report);
    for(const file of staged.targets){
      const syntax=spawnSync('node',['--check',file.staged],{encoding:'utf8'});
      assert.equal(syntax.status,0,'Staged syntax failed: '+path.basename(file.staged)+' '+syntax.stderr.slice(0,200));
      const originalText=fs.readFileSync(file.backup,'utf8'),patchedText=fs.readFileSync(file.staged,'utf8');
      assert.deepEqual(patchedText.match(/export\{[^}]+\}/g),originalText.match(/export\{[^}]+\}/g),'Export mapping changed');
      const relativeImports=text=>[...text.matchAll(/(?:from|import\()["'](\.[^"']+)["']/g)].map(m=>m[1]);
      assert.deepEqual(relativeImports(patchedText),relativeImports(originalText),'Relative import mapping changed');
      fs.copyFileSync(file.staged,file.target);
    }
    report.checks.push('five staged targets parse and preserve relative imports/exports');save(evidenceFile,report);
    report.runtimeChecks=await runAwaitChecks(work,staged);save(evidenceFile,report);
    for(const mode of ['disabled','enabled','enabled-fallback']){
      const modeOutput=path.join(work,mode+'.json');
      const comparison=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--baseline',fixture,modeOutput,mode,report.runtimeChecks.loggerFile],{
        cwd:home,encoding:'utf8',timeout:20000,
        env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:work,TMP:work,HOME:home,USERPROFILE:home,APPDATA:home,LOCALAPPDATA:home,PI_CODING_AGENT_DIR:path.join(home,'agent'),BUN_INSTALL_CACHE_DIR:path.join(work,'bun-cache'),BUN_RUNTIME_TRANSPILER_CACHE_PATH:path.join(work,'bun-transpiler')}
      });
      if(comparison.status!==0)console.error(comparison.stderr);
      assert.equal(comparison.status,0,mode+' comparison failed');
      report[mode]=JSON.parse(fs.readFileSync(modeOutput,'utf8'));
      const outcomes=r=>r.cases.map(({snapshot:_snapshot,...rest})=>rest).sort((a,b)=>a.name.localeCompare(b.name));
      assert.deepEqual(outcomes(report[mode]),outcomes(report.baseline));save(evidenceFile,report);
    }
    report.checks.push('actual patched adapter baseline/disabled/enabled traces and settlement; native and fallback body iteration');
    report.boundaryChecks=await checkAwaitBoundaries(work,staged,report.runtimeChecks.loggerFile);save(evidenceFile,report);
    report.smoke=smoke(fixture);save(evidenceFile,report);
    const stagedHashes=staged.targets.map(f=>sha256(fs.readFileSync(f.target)));
    await assert.rejects(apply(fixture,stageDirectory,'install',{disposable:true,inactive:()=>true}),/Invalid pair manifest/);
    assert.deepEqual(staged.targets.map(f=>sha256(fs.readFileSync(f.target))),stagedHashes);
    report.costs=await benchmarkAwaits(work,staged,report.runtimeChecks.loggerFile);save(evidenceFile,report);
    report.checks.push('legacy installer rejects expanded revision without target writes','isolated provider-free staged CLI and main/Google adapter smoke; OpenAI adapter imported by fake-transport comparisons');
    report.missing=[];report.status='passed';report.t3Complete=true;
    report.activationRequirements=['separately selected activation','expanded-set guarded recovery and mixed-version compatibility proof','fresh canonical mapping, source hashes and verified backups','safe replacement evidence and fresh consistent-set smoke'];
    save(evidenceFile,report);
  } catch (error) {
    report.status = 'failed'; report.failure = { name: error.name, code: typeof error.code === 'string' ? error.code : undefined };
    throw error;
  } finally {
    report.readSourceUnchanged = JSON.stringify(readHashes(canonical)) === JSON.stringify(before);
    report.recoveryUnchanged=manifest.targets.every((file,i)=>sha256(fs.readFileSync(file.backup))===sha256(backups[i])&&sha256(fs.readFileSync(file.staged))===file.patchedHash);
    const finalMapping=inspect(canonical,hashes['chunk-OJP47DM6.js']);
    report.mappingUnchanged=finalMapping.entryHash===live.entryHash&&finalMapping.runtimeHash===live.runtimeHash&&fs.realpathSync('D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent')===canonical;
    if(!report.readSourceUnchanged||!report.recoveryUnchanged||!report.mappingUnchanged){report.status='failed';report.t3Complete=false}
    save(evidenceFile, report); assert(report.readSourceUnchanged&&report.recoveryUnchanged&&report.mappingUnchanged, 'Read source/recovery/mapping changed');
  }
  console.log(JSON.stringify({ status: report.status, evidenceFile, baselineCases: report.baseline.cases.length, t3Complete: report.t3Complete }));
}

const [first, second, third, mode, loggerModule] = process.argv.slice(2);
if (first === '--baseline') await baseline(second, third, mode, loggerModule);
else { assert(first && second && !third, 'Usage: bun check-awaits.mjs SOURCE_ROOT EVIDENCE_JSON'); await preflight(first, second); }
