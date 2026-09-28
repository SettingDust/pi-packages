import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { channel } from 'node:diagnostics_channel';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspect, inspectGoogle, stage, sha256 } from './stage.mjs';
import { createDiagnostics } from './logger.mjs';
import { apply } from './install.mjs';

export function extract(text, start, end) {
  if (!text.includes(start)) start = start.replace(/^async /, '');
  if (!text.includes(end)) end = end.replace(/^async /, '');
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}
// Execute actual guarded SDK methods. Only their dependencies (transport, auth,
// retry scheduler, converters and response decoding) are fake, with no network.
export function sdkRuntime(text, transport, { vertex = false, retryOptions, signal, mark = () => {}, channelFactory = channel, auth = async () => {} } = {}) {
  const responses = [], signals = [], disposed = [];
  const scope = vm.createContext({ __stallGoogleChannel: channelFactory, URL, JSON, Number, Object, Math, Error,
    fetch: async (url, init) => { mark('fetch'); signals.push(init.signal); const response = await transport(url, init); responses.push(response); return response; },
    createAttemptSignal: (_timeout, value) => ({ signal: value, dispose() { disposed.push(value); mark('dispose'); } }),
    throwErrorIfNotOK: async response => { mark('status'); if (!response.ok) throw response.failure; },
    DEFAULT_RETRY_HTTP_STATUS_CODES: [429, 503], DEFAULT_RETRY_ATTEMPTS: 3,
    DEFAULT_RETRY_INITIAL_DELAY: 0, DEFAULT_RETRY_MAX_DELAY: 0, DEFAULT_RETRY_EXP_BASE: 2, DEFAULT_RETRY_JITTER: 0,
    import_p_retry: { default: async (run, options) => { for (let i = 0; ; i++) { try { return await run(); } catch (error) { options.onFailedAttempt({ error }); if (i >= options.retries) throw error; } } } },
    generateContentParametersToVertex: (_client, params) => ({ _url: {}, _query: {}, content: params.content }),
    generateContentParametersToMldev: (_client, params) => ({ _url: {}, _query: {}, content: params.content }),
    formatMap: () => 'fake-model:streamGenerateContent',
    __asyncGenerator: () => ({ decoded: 'fake' })
  });
  if (text.startsWith('import { channel as __stallGoogleChannel }')) {
    vm.runInContext(text.slice(text.indexOf('const __stallGoogleModel='), text.indexOf('import { createRequire')), scope);
  }
  const methods = [
    extract(text, 'async requestStream(', 'async includeExtraHttpOptionsToRequestInit('),
    extract(text, 'async streamApiCall(', 'processStreamResponse(response){'),
    extract(text, 'async apiCall(', 'getDefaultHeaders(){')
  ];
  const Api = vm.runInContext('(class {' + methods.join('') + '})', scope);
  const api = new Api();
  api.clientOptions = { httpOptions: { retryOptions } };
  api.patchHttpOptions = (_base, override) => override;
  api.shouldPrependVertexProjectPath = () => false;
  api.constructUrl = () => new URL('https://offline.invalid/');
  api.includeExtraHttpOptionsToRequestInit = async init => { mark('auth'); await auth(api); return init; };
  api.processStreamResponse = response => { mark('decode'); return response; };
  api.isVertexAI = () => vertex;
  const Model = vm.runInContext('(class {' + extract(text, 'async generateContentStreamInternal(', 'async embedContentInternal(') + '})', scope);
  const model = new Model(); model.apiClient = api;
  const params = { content: 'PRIVATE_SENTINEL', config: { abortSignal: signal } };
  return { api, model, params, responses, signals, disposed, scope };
}
export function mainRuntime(text, diagnostics) {
  const scope = vm.createContext({ __sd: diagnostics, normalizeContext: x => x });
  return vm.runInContext('(' + extract(text, 'async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage(') + ')', scope);
}
export function adapterCall(excerpt, client, params, model, options, mark = () => {}) {
  // Both source-cited adapter call sites are identical apart from surrounding setup.
  const body = 'let nextParams;' + excerpt + ';return googleStream';
  return vm.runInNewContext('(async()=>{' + body + '})()', { client, params, model, options,
    retryGoogleRequest: callback => { mark('adapter.retry'); return callback(); } });
}
export function readRecords(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).flatMap(file => fs.readFileSync(path.join(directory, file), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).sort((a, b) => a.seq - b.seq);
}
const success = (status = 200) => ({ status, ok: status >= 200 && status < 300, failure: new Error('PRIVATE_SENTINEL') });

async function check(root, evidenceFile) {
  assert.ok(root && evidenceFile, 'Usage: node check-google.mjs TARGET_ROOT EVIDENCE_JSON');
  const before = inspect(root), originalSdk = inspectGoogle(before), work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-google-'));
  const manifest = stage(root, work), patched = fs.readFileSync(manifest.targets[0].staged, 'utf8'), sdk = fs.readFileSync(manifest.targets[1].staged, 'utf8');
  const lazyFile = path.join(before.root, 'dist/bundle/chunks/chunk-RCZIEVGO.js'), lazySource = fs.readFileSync(lazyFile, 'utf8');
  const lazyBody = extract(lazySource, 'function lazyApi(', 'var __rewriteRelativeImportExtension=');
  const lazyApi = vm.runInNewContext('(' + lazyBody + ')', { lazyStream: (_model, setup) => setup() });
  const evidence = { status: 'running', activationAllowed: false, t1Complete: false, revision: manifest.revision,
    command: [process.execPath, 'packages/pi-harness/tools/pi-stall-diagnostics/check-google.mjs', root, evidenceFile], runtime: { node: process.version, bun: process.versions.bun }, manifest,
    lazyGuard: { file: 'dist/bundle/chunks/chunk-RCZIEVGO.js', sha256: sha256(lazySource), selectorSha256: sha256(lazyBody) }, checks: [] };
  const save = () => { fs.mkdirSync(path.dirname(evidenceFile), { recursive: true }); fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n'); };
  const passed = name => { evidence.checks.push(name); save(); };
  save();
  try {
    for (const file of manifest.targets) {
      assert.equal(sha256(fs.readFileSync(file.backup)), file.originalHash);
      assert.equal(sha256(fs.readFileSync(file.staged)), file.patchedHash);
      const syntax = spawnSync(process.versions.bun ? 'node' : process.execPath, ['--check', file.staged], { encoding: 'utf8' });
      assert.equal(syntax.status, 0, syntax.stderr);
    }
    assert.throws(() => apply(root, work, 'install'), /Paired installation is disabled/);
    passed('Both stages parse; two verified backups/stages; legacy installer refuses pair before mutation');
    const logs = path.join(work, 'logs'), diagnostics = createDiagnostics(logs), request = mainRuntime(patched, diagnostics);
    const originalRequest = mainRuntime(before.bytes.toString(), undefined);
    let pending;
    const run = async ({ api = 'google-generative-ai', statuses = [200], reject, abort = false, logger = diagnostics, main = request,
      sdkText = sdk, onPayload, deferred = false, mark = () => {}, extraAuth, transportOverride } = {}) => {
      let attempt = 0;
      const controller = new AbortController(), failure = new Error('PRIVATE_SENTINEL');
      if (abort) controller.abort(failure);
      const runtime = sdkRuntime(sdkText, transportOverride || (async () => {
        controller.signal.throwIfAborted(); if (reject) throw reject;
        return success(statuses[Math.min(attempt++, statuses.length - 1)]);
      }), { vertex: api === 'google-vertex', signal: controller.signal, retryOptions: statuses.length > 1 ? { attempts: statuses.length } : undefined, mark, auth: extraAuth });
      const model = { api, provider: 'fake' }, config = { model, convertToLlm: x => x, onPayload };
      const excerpt = originalSdk.citations.find(c => c.file.startsWith(api === 'google-vertex' ? 'google-vertex' : 'google-generative') && c.symbol === 'Payload callback and SDK call').excerpt;
      const stream = async (_model, _context, options) => {
        assert.equal(options.signal, controller.signal);
        await adapterCall(excerpt, { models: { generateContentStream: p => runtime.model.generateContentStreamInternal(p) } }, runtime.params, model, options, mark);
        if (deferred) pending = logger.scopeResponse(() => runtime.model.generateContentStreamInternal(runtime.params));
        return { async *[Symbol.asyncIterator]() { yield { type: 'done' }; }, result: async () => ({ role: 'assistant', content: [], stopReason: 'stop' }) };
      };
      const lazy = lazyApi(async () => ({ stream, streamSimple: stream }));
      const invoke = () => main({ messages: [] }, config, controller.signal, async () => { mark('emit'); }, api === 'google-vertex' ? lazy.streamSimple : lazy.stream);
      try {
        if (logger) await logger.scope({ session: logger.session(api), turn: logger.next() }, invoke); else await invoke();
      } catch (error) { if (abort) assert.equal(error, failure); throw error; }
      for (const signal of extraAuth ? runtime.signals.slice(-1) : runtime.signals) assert.equal(signal, controller.signal);
      return runtime;
    };
    for (const api of ['google-generative-ai', 'google-vertex']) {
      let start = readRecords(logs).length;
      await run({ api });
      let records = readRecords(logs).slice(start), response = records.find(e => e.event === 'provider.response'), req = records.find(e => e.event === 'provider.request');
      assert.equal(response.status, 200);
      for (const key of ['operation', 'session', 'turn', 'request']) assert.equal(response[key], req[key]);
      assert.equal(response.tool, undefined);
      start = readRecords(logs).length;
      const retried = await run({ api, statuses: [503, 429, 200] });
      assert.deepEqual(readRecords(logs).slice(start).filter(e => e.event === 'provider.response').map(e => e.status), [503, 429, 200]);
      assert.equal(retried.disposed.length, 2);
      start = readRecords(logs).length;
      await assert.rejects(run({ api, statuses: [400] }));
      assert.deepEqual(readRecords(logs).slice(start).filter(e => e.event === 'provider.response').map(e => e.status), [400]);
      const failure = new Error('PRIVATE_SENTINEL');
      start = readRecords(logs).length;
      await assert.rejects(run({ api, reject: failure }), e => e === failure);
      await assert.rejects(run({ api, abort: true }));
      assert.equal(readRecords(logs).slice(start).filter(e => e.event === 'provider.response').length, 0);
    }
    passed('Both adapter call sites through actual lazyApi (fake load/stream forwarding) and Models/requestStream/streamApiCall/apiCall: success, retry, non-OK, rejection, abort, signal/error identity and request linkage');
    // Direct raw-response identity and catch/dispose behavior, with real apiCall body.
    const raw = success(), err = new Error('PRIVATE_SENTINEL'), ctrl = new AbortController();
    const direct = sdkRuntime(sdk, async () => raw, { signal: ctrl.signal });
    assert.equal(await direct.api.apiCall('offline', {}, undefined, undefined, ctrl.signal), raw);
    const rejected = sdkRuntime(sdk, async () => { throw err; });
    await assert.rejects(rejected.api.apiCall('offline', {}, undefined, undefined, ctrl.signal), e => e === err);
    assert.deepEqual(rejected.disposed, [ctrl.signal]);
    let start = readRecords(logs).length;
    await Promise.all([run({ api: 'google-generative-ai', statuses: [503, 201] }), run({ api: 'google-vertex', statuses: [202] }), run({ api: 'other' })]);
    let records = readRecords(logs).slice(start), requests = records.filter(e => e.event === 'provider.request');
    assert.equal(new Set(requests.map(e => e.request)).size, 3);
    assert.deepEqual(records.filter(e => e.event === 'provider.response').map(e => e.status).sort(), [201, 202, 503]);
    for (const response of records.filter(e => e.event === 'provider.response')) {
      const req = requests.find(e => e.request === response.request);
      for (const key of ['session', 'turn', 'operation']) assert.equal(response[key], req[key]);
    }
    start = readRecords(logs).length;
    let callbackReceiver, callbackParams, callbackModel, authNested = false;
    await run({ onPayload: function(params, model) {
      callbackReceiver = this; callbackParams = params; callbackModel = model;
      // Full model call spawned by user callback inherits ineligible context.
      pending = direct.model.generateContentStreamInternal(direct.params);
      return pending.then(() => undefined);
    }, extraAuth: async api => {
      if (authNested) return;
      authNested = true;
      await api.apiCall('auth', {}, undefined, undefined, ctrl.signal);
      await api.requestStream({ path: 'unrelated', httpMethod: 'GET' });
    } });
    await pending;
    assert.ok(callbackReceiver && callbackParams && callbackModel);
    assert.equal(readRecords(logs).slice(start).filter(e => e.event === 'provider.response').length, 1);
    await run({ deferred: true });
    start = readRecords(logs).length;
    await pending();
    channel('pi.stall.google.response.v1').publish(200);
    assert.equal(readRecords(logs).length, start);
    await diagnostics.scope({ session: 1, turn: 2, request: 3, tool: 4 }, async () => {
      diagnostics.track();
      try {
        await diagnostics.provider(5, 'google-vertex', async () => {
          for (const value of [undefined, null, {}, '200', 99, 600, 200.5, NaN]) channel('pi.stall.google.response.v1').publish(value);
          channel('pi.stall.google.response.v1').publish(204);
        });
      } finally { diagnostics.untrack(); }
    });
    assert.equal(readRecords(logs).length, start + 1);
    assert.equal(readRecords(logs).at(-1).tool, undefined);
    passed('Concurrent Google/non-Google isolation; unrelated SDK/auth/user callback/expired context exclusion; invalid statuses; raw Response identity');
    // A throwing dependency inside the subscriber is caught by its whole-body guard.
    const originalInteger = Number.isInteger;
    await diagnostics.scope({ request: 8 }, () => {
      diagnostics.track();
      try { diagnostics.provider(9, 'google-vertex', () => {
        Number.isInteger = () => { throw err; };
        try { channel('pi.stall.google.response.v1').publish(200); } finally { Number.isInteger = originalInteger; }
      }); } finally { diagnostics.untrack(); }
    });
    const badDir = path.join(work, 'not-directory'); fs.writeFileSync(badDir, 'fixture');
    const failedLogger = createDiagnostics(badDir);
    await run({ logger: failedLogger, main: mainRuntime(patched, failedLogger) });
    for (const channelFactory of [() => { throw err; }, () => ({ hasSubscribers: true, publish() { throw err; } })]) {
      const failedSdk = sdkRuntime(sdk, async () => success(), { channelFactory });
      await failedSdk.model.generateContentStreamInternal(failedSdk.params);
    }
    assert.equal(channel('pi.stall.google.response.v1').hasSubscribers, false);
    const disabled = createDiagnostics(undefined);
    disabled.scope({ request: 10 }, () => { disabled.track(); assert.equal(channel('pi.stall.google.response.v1').hasSubscribers, false); disabled.untrack(); });
    passed('Subscriber body failure, SDK channel setup/publication failure and logger write failure isolated; disabled/no-active subscription cleanup');
    const callbackThis = {}, callbackArg = {}, callbackPromise = Promise.resolve(callbackArg);
    const wrapped = diagnostics.withoutGoogle(function(arg) { assert.equal(this, callbackThis); assert.equal(arg, callbackArg); return callbackPromise; });
    assert.equal(wrapped.call(callbackThis, callbackArg), callbackPromise);
    assert.throws(() => diagnostics.withoutGoogle(() => { throw err; })(), e => e === err);
    passed('Callback receiver/argument/return-Promise/error identity preserved');
    const traces = [];
    for (const api of ['google-generative-ai', 'google-vertex']) for (const scenario of [{ statuses: [200] }, { statuses: [503, 200] }, { statuses: [400] }, { reject: err }, { abort: true }]) {
      const timeline = async (main, sdkText, logger) => {
        const trace = []; let clock = 0, running = true;
        const pulse = () => { if (running) { clock++; queueMicrotask(pulse); } }; queueMicrotask(pulse);
        try { await run({ ...scenario, api, main, sdkText, logger, mark: event => trace.push([event, clock]) }); trace.push(['return', clock]); }
        catch { trace.push(['reject', clock]); }
        finally { running = false; }
        return trace;
      };
      const baseline = await timeline(originalRequest, originalSdk.bytes.toString(), null);
      assert.deepEqual(await timeline(mainRuntime(patched, disabled), sdk, disabled), baseline);
      assert.deepEqual(await timeline(request, sdk, diagnostics), baseline);
      traces.push({ api, scenario: scenario.abort ? 'abort' : scenario.reject ? 'reject' : scenario.statuses.join(','), trace: baseline });
    }
    evidence.asyncTraces = traces;
    passed('Actual extracted request/SDK baseline, enabled and disabled microtask traces identical for success/retry/non-OK/rejection/abort');
    const all = readRecords(logs), allowed = new Set(['event','pid','run','seq','wall','mono','operation','handler','session','turn','request','tool','status']);
    assert.ok(!JSON.stringify(all).includes('PRIVATE_SENTINEL'));
    for (const record of all) assert.ok(Object.keys(record).every(key => allowed.has(key)));
    const rotationDir = path.join(work, 'rotation'), rotating = createDiagnostics(rotationDir, { maxBytes: 1024, files: 3 });
    for (let i = 0; i < 20; i++) await run({ logger: rotating, main: mainRuntime(patched, rotating) });
    assert.equal(fs.readdirSync(rotationDir).length, 3);
    for (const file of fs.readdirSync(rotationDir)) assert.ok(fs.statSync(path.join(rotationDir, file)).size <= 1024);
    const rotationFailureDir = path.join(work, 'rotation-failure'), rotationFailure = createDiagnostics(rotationFailureDir, { maxBytes: 1024, files: 3 });
    const rename = fs.renameSync;
    let injected = false;
    fs.renameSync = function(from, ...args) { if (String(from).startsWith(rotationFailureDir)) { injected = true; throw err; } return rename.call(this, from, ...args); };
    try { for (let i = 0; i < 4; i++) await run({ logger: rotationFailure, main: mainRuntime(patched, rotationFailure) }); }
    finally { fs.renameSync = rename; }
    assert.ok(injected);
    assert.equal(channel('pi.stall.google.response.v1').hasSubscribers, false);
    passed('Forced rotation failure leaves requests successful and subscriber cleanup intact');
    assert.equal(sha256(fs.readFileSync(lazyFile)), evidence.lazyGuard.sha256);
    assert.equal(sha256(inspect(root).bytes), manifest.targets[0].originalHash);
    assert.equal(sha256(inspectGoogle(inspect(root)).bytes), manifest.targets[1].originalHash);
    passed('Fixed-schema sentinel privacy; three-file bounded rotation; all installed source guards unchanged');
    evidence.sourceHashes = Object.fromEntries(['stage.mjs','logger.mjs','check-google.mjs','install.mjs'].map(name => [name, sha256(fs.readFileSync(new URL(name, import.meta.url)))]));
    evidence.events = all.length; evidence.status = 'passed';
    evidence.limitations = ['Extracted actual boundaries with fake transport/auth/retry scheduler/decoding, not real providers or full CLI runtime.', 'Arbitrary external diagnostics-channel subscribers are outside ownership; this logger catches its own entire subscriber body.', 'T1-P paired recovery and independent T2 activation remain excluded.'];
    save(); console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks.length, evidenceFile }));
  } catch (error) { evidence.status = 'failed'; evidence.failure = { name: error.name, code: error.code }; save(); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await check(...process.argv.slice(2));
