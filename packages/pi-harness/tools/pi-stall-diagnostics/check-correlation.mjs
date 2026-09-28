import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createDiagnostics } from './logger.mjs';
import { inspect, stage, sha256 } from './stage.mjs';

const [root, evidencePath] = process.argv.slice(2);
assert.ok(root && evidencePath, 'Pass read-only installed root and evidence path');
const before = inspect(root), work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-correlation-'));
const manifest = stage(root, work), source = fs.readFileSync(path.join(work, 'patched.mjs'), 'utf8');
const syntax = spawnSync(process.execPath, ['--check', path.join(work, 'patched.mjs')], { encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
const logs = path.join(work, 'logs'), diag = createDiagnostics(logs);
const secret = 'PRIVATE_PROMPT_SUMMARY_ARGUMENT_OUTPUT_HEADER_KEY_SESSION_TOOL_ERROR_STACK';
const failure = new Error(secret);
const records = () => fs.readdirSync(logs).flatMap(f => fs.readFileSync(path.join(logs, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).sort((a, b) => a.seq - b.seq);
function extract(text, start, end) {
  if (start === 'async abort(){') start = text.includes('abort(){return __sd.scope(__sd.owner') ? 'abort(){return __sd.scope(__sd.owner' : 'async abort(){this._isAgentRunActive';
  if (!text.includes(start)) start = start.replace(/^async /, '');
  if (!text.includes(end)) end = end.replace(/^async /, '');
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}
function runtime(text, logger) {
  const scope = vm.createContext({ __sd: logger, normalizeContext: x => x, snapshotEventHandlers: x => x,
    generateId: () => 'generated', createErrorToolResult: message => ({ message }),
    declareToolChanges: (_ctx, messages) => messages, getDefaultStreamFn: () => { throw failure; } });
  for (const [name, start, end] of [
    ['runLoop', 'async function runLoop(initialContext,', 'function declareToolChanges('],
    ['streamAssistantResponse', 'async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage('],
    ['runAgentLoop', 'async function runAgentLoop(', 'async function runAgentLoopContinue('],
    ['runAgentLoopContinue', 'async function runAgentLoopContinue(', 'function createAgentStream('],
    ['executePreparedToolCall', 'async function executePreparedToolCall(', 'async function finalizeExecutedToolCall(']
  ]) scope[name] = vm.runInContext('(' + extract(text, start, end) + ')', scope);
  for (const [name, start, end] of [
    ['Handler', 'async emitMessageEnd(event){', 'async emitToolResult('],
    ['Append', 'appendMessage(message){', 'appendThinkingLevelChange('],
    ['Hook', 'async emitToolCall(event){', 'async emitUserBash('],
    ['Abort', 'async abort(){', 'async waitForIdle(){this.isIdle']
  ]) scope[name] = vm.runInContext('(class {' + extract(text, start, end) + '})', scope);
  return scope;
}
const r = runtime(source, diag);
function gate() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const tick = () => new Promise(resolve => setImmediate(resolve));
const held = gate(), ready = gate(), externalCallbacks = [], observed = [];
function setup(sessionId, rt = r) {
  const append = new rt.Append(); append.sessionId = sessionId; append.byId = new Map(); append._appendEntry = () => {};
  const handler = new rt.Handler(); handler.createContext = () => ({}); handler.emitError = () => {};
  handler.extensions = [{ ext: { path: secret }, handlers: [async event => { observed.push(event.message); }, async () => {}] }];
  const hook = new rt.Hook(); hook.createContext = () => ({}); hook.extensions = [{ handlers: [async () => ({ block: false })] }];
  const emit = async event => { if (event.type === 'message_end') { await handler.emitMessageEnd(event); append.appendMessage(event.message); } };
  const config = { sessionId, model: { provider: 'fake' }, convertToLlm: x => x,
    onResponse: function(response, extra) { assert.equal(this.sessionId, sessionId); assert.equal(response.headers, secret); assert.equal(extra, secret); return response; } };
  return { append, handler, hook, emit, config };
}
const a = setup(secret + '-A'), b = setup(secret + '-B');
const provider = (label, wait = false, tool = false) => async (_model, _context, options) => {
  externalCallbacks.push(() => options.onResponse({ status: label === 'A' ? 201 : 202, headers: secret }, secret));
  if (wait) { ready.resolve(); await held.promise; }
  const message = { role: 'assistant', content: tool ? [secret, secret + '-second'].map(id => ({ type: 'toolCall', id, name: secret, arguments: secret })) : [], stopReason: 'stop' };
  return { async *[Symbol.asyncIterator]() { yield { type: 'done' }; }, result: async () => message };
};
const executions = [];
r.executeToolCalls = async (_context, message, config, signal, emit) => {
  const owner = config.sessionId === a.config.sessionId ? a : b;
  await Promise.all(message.content.map(async toolCall => {
    await owner.hook.emitToolCall({ toolCallId: toolCall.id });
    const result = await r.executePreparedToolCall({ toolCall, args: secret, tool: { execute: async () => secret } }, signal, emit);
    executions.push(result); assert.equal(result.result, secret); return result;
  }));
  return { messages: [], terminate: true };
};
const pa = r.runAgentLoop([{ role: 'user', content: secret }], { messages: [] }, a.config, a.emit, undefined, provider('A', true, true));
await ready.promise;
const activeAbort = new r.Abort(); activeAbort.sessionManager = { sessionId: a.config.sessionId };
for (const name of ['abortRetry', 'abortCompaction', 'abortBranchSummary']) activeAbort[name] = () => {};
activeAbort.agent = { abort() {} }; activeAbort.waitForIdle = async () => {};
await activeAbort.abort();
const activeAbortRecord = records().at(-1), activeRequest = records().find(e => e.event === 'provider.request');
for (const key of ['session', 'turn', 'request']) assert.equal(activeAbortRecord[key], activeRequest[key]);
await r.runAgentLoop([], { messages: [] }, b.config, b.emit, undefined, provider('B', false, true));
held.resolve(); await pa;
// Invoke callbacks from outside their originating ALS context, after both runs finish.
for (const callback of externalCallbacks) assert.ok(callback().status >= 200);
const first = records();
const requests = first.filter(e => e.event === 'provider.request');
assert.equal(requests.length, 2);
assert.notEqual(requests[0].session, requests[1].session);
assert.notEqual(requests[0].turn, requests[1].turn);
assert.notEqual(requests[0].request, requests[1].request);
for (const req of requests) {
  const group = first.filter(e => e.request === req.request);
  for (const event of ['provider.response', 'stream.end', 'handler.enter', 'append.enter', 'tool.hooks.enter', 'tool.hook.enter', 'tool.execute.enter', 'tool.execute.exit']) assert.ok(group.some(e => e.event === event), event);
  assert.ok(group.every(e => e.session === req.session && e.turn === req.turn));
  const tools = group.filter(e => e.event.startsWith('tool.'));
  const toolIds = new Set(tools.map(e => e.tool)); assert.equal(toolIds.size, 2);
  for (const toolId of toolIds) {
    assert.ok(Number.isSafeInteger(toolId));
    const group = tools.filter(e => e.tool === toolId);
    for (const event of ['tool.hook.enter', 'tool.execute.enter', 'tool.execute.exit']) assert.equal(group.filter(e => e.event === event).length, 1);
  }
}
assert.notEqual(first.find(e => e.event === 'tool.execute.enter' && e.session === requests[0].session).tool, first.find(e => e.event === 'tool.execute.enter' && e.session === requests[1].session).tool);
assert.ok(first.some(e => e.event === 'append.enter' && e.request === undefined && e.session === requests[0].session), 'initial user append has session/turn before request');

// Repeated runs use a stable session despite newly copied message arrays; nested runs restore their caller.
const start = records().length;
let nested = false;
a.handler.extensions[0].handlers = [async () => {
  if (nested) return; nested = true;
  await r.runAgentLoop([], { messages: [] }, b.config, b.emit, undefined, provider('B'));
}];
await r.runAgentLoop([], { messages: [] }, a.config, a.emit, undefined, provider('A'));
const nestedRecords = records().slice(start), outer = nestedRecords.find(e => e.event === 'provider.request');
assert.equal(outer.session, requests[0].session);
assert.notEqual(outer.turn, requests[0].turn);
assert.equal(nestedRecords.at(-1).session, outer.session);
assert.equal(nestedRecords.at(-1).request, outer.request);

// Two requests nested/concurrent in a single turn must not overwrite one another.
const concurrentStart = records().length, requestGate = gate();
await diag.scope({ session: 900, turn: 901 }, async () => {
  const emit = async () => {};
  const pending = r.streamAssistantResponse({ messages: [] }, a.config, undefined, emit, async (...args) => { await requestGate.promise; return provider('A')(...args); });
  await r.streamAssistantResponse({ messages: [] }, a.config, undefined, emit, provider('B'));
  requestGate.resolve(); await pending;
});
const concurrent = records().slice(concurrentStart);
const starts = concurrent.filter(e => e.event === 'assistant.enter');
assert.equal(new Set(starts.map(e => e.request)).size, 2);
for (const e of starts) assert.ok(concurrent.filter(x => x.operation === e.operation).every(x => x.request === e.request));

// Turn changes retain old async snapshots; subsequent actual loop turns get fresh IDs.
let turns = 0, delayed;
const multi = setup(secret + '-multi');
multi.config.finishTurn = () => ++turns < 2 ? { action: 'continue' } : { action: 'end' };
multi.config.prepareNextTurn = async () => {
  delayed = new Promise(resolve => setImmediate(() => { multi.append.appendMessage({ content: secret }); resolve(); }));
};
const turnStart = records().length;
await r.runAgentLoop([], { messages: [] }, multi.config, multi.emit, undefined, provider('A'));
await delayed;
const turnRecords = records().slice(turnStart), turnRequests = turnRecords.filter(e => e.event === 'provider.request');
assert.equal(turnRequests.length, 2); assert.notEqual(turnRequests[0].turn, turnRequests[1].turn);
assert.equal(turnRecords.at(-1).turn, turnRequests[0].turn);

// Continued runs and overlapping runs of the same session do not invent an abort owner.
const continuationStart = records().length;
await r.runAgentLoopContinue({ messages: [{ role: 'user', content: secret }] }, b.config, b.emit, undefined, provider('B'));
assert.equal(records().slice(continuationStart).find(e => e.event === 'provider.request').session, requests[1].session);
await assert.rejects(r.runAgentLoopContinue({ messages: [] }, b.config, b.emit), /Cannot continue/);
const overlapGate = gate(), overlapReady = gate(); let overlapCount = 0;
const overlapProvider = async (...args) => { if (++overlapCount === 2) overlapReady.resolve(); await overlapGate.promise; return provider('B')(...args); };
const overlaps = [1, 2].map(() => r.runAgentLoop([], { messages: [] }, b.config, b.emit, undefined, overlapProvider));
await overlapReady.promise;
activeAbort.sessionManager.sessionId = b.config.sessionId; await activeAbort.abort();
for (const key of ['turn', 'request', 'tool']) assert.equal(records().at(-1)[key], undefined);
overlapGate.resolve(); await Promise.all(overlaps);
await activeAbort.abort();
for (const key of ['turn', 'request', 'tool']) assert.equal(records().at(-1)[key], undefined);

// Errors, pending handlers, abort signals, synchronous append, and external session attribution.
const errorStart = records().length;
await diag.scope({ session: diag.session(a.config.sessionId), turn: 1001 }, async () => {
  await assert.rejects(r.streamAssistantResponse({ messages: [] }, a.config, undefined, async () => {}, async () => { throw failure; }), e => e === failure);
  const controller = new AbortController(); controller.abort(failure);
  await assert.rejects(r.streamAssistantResponse({ messages: [] }, a.config, controller.signal, async () => {}, async (_m, _c, options) => { options.signal.throwIfAborted(); }), e => e === failure);
  const waiting = gate(); a.handler.extensions[0].handlers = [async () => {}, async () => { await waiting.promise; throw failure; }];
  const pending = a.handler.emitMessageEnd({ message: { content: secret } }); await tick();
  assert.equal(records().at(-1).event, 'handler.enter'); waiting.resolve(); await pending;
  a.append._appendEntry = () => { throw failure; };
  assert.throws(() => a.append.appendMessage({ content: secret }), e => e === failure);
  a.hook.extensions[0].handlers = [async () => { throw failure; }];
  await assert.rejects(a.hook.emitToolCall({ toolCallId: secret }), e => e === failure);
  const result = await r.executePreparedToolCall({ toolCall: { id: secret }, tool: { execute: async () => { throw failure; } } }, undefined, async () => {});
  assert.equal(result.isError, true);
});
const abort = new r.Abort(); abort.sessionManager = { sessionId: a.config.sessionId };
const abortOrder = [];
for (const name of ['abortRetry', 'abortCompaction', 'abortBranchSummary']) abort[name] = () => abortOrder.push(name);
abort.agent = { abort: () => abortOrder.push('agent') }; abort.waitForIdle = async () => abortOrder.push('idle');
await diag.scope({ session: 9999, turn: 9998, request: 9997, tool: 9996 }, () => abort.abort());
assert.deepEqual(abortOrder, ['abortRetry', 'abortCompaction', 'abortBranchSummary', 'agent', 'idle']);
const abortRecord = records().at(-1); assert.equal(abortRecord.session, requests[0].session);
for (const key of ['turn', 'request', 'tool']) assert.equal(abortRecord[key], undefined);
for (const event of ['stream.error', 'handler.error', 'append.error', 'tool.hook.error', 'tool.execute.error', 'tool.execute.exit', 'abort.exit']) assert.ok(records().slice(errorStart).some(e => e.event === event), event);

// Compare runnable original and patched async boundaries against a microtask clock.
async function timeline(text, logger) {
  const rt = runtime(text, logger), trace = []; let clock = 0, running = true;
  function mark(name) { trace.push([name, clock]); }
  function pulse() { if (running) { clock++; queueMicrotask(pulse); } } queueMicrotask(pulse);
  const test = setup(secret + '-timing', rt);
  test.handler.extensions[0].handlers = [async () => { mark('handler'); }, async () => { mark('handler2'); }];
  test.append._appendEntry = () => mark('append');
  const stream = async () => { mark('provider'); return { async *[Symbol.asyncIterator]() { yield { type: 'done' }; }, result: async () => ({ role: 'assistant', content: [], stopReason: 'stop' }) }; };
  const result = await rt.runAgentLoop([{ role: 'user', content: secret }], { messages: [] }, test.config, test.emit, undefined, stream); mark('run.return');
  assert.equal(result.length, 2);
  await test.hook.emitToolCall({ toolCallId: secret }); mark('hook.return');
  await rt.executePreparedToolCall({ toolCall: { id: secret }, tool: { execute: async () => { mark('execute'); return secret; } } }, undefined, async () => {}); mark('execute.return');
  test.hook.extensions[0].handlers = [async () => { mark('hook.error'); throw failure; }];
  await assert.rejects(test.hook.emitToolCall({ toolCallId: secret }), e => e === failure); mark('hook.reject');
  const badTool = await rt.executePreparedToolCall({ toolCall: { id: secret }, tool: { execute: async () => { mark('execute.error'); throw failure; } } }, undefined, async () => {});
  assert.equal(badTool.isError, true); mark('execute.error.return');
  await assert.rejects(rt.streamAssistantResponse({ messages: [] }, test.config, undefined, async () => {}, async () => { mark('provider.error'); throw failure; }), e => e === failure); mark('provider.reject');
  running = false; return trace;
}
const originalTrace = await timeline(before.bytes.toString(), undefined);
assert.deepEqual(await timeline(source, createDiagnostics(undefined)), originalTrace);
assert.deepEqual(await timeline(source, diag), originalTrace);

const all = records();
const allowed = new Set(['event', 'pid', 'run', 'seq', 'wall', 'mono', 'operation', 'handler', 'session', 'turn', 'request', 'tool', 'status']);
for (const record of all) {
  assert.ok(Object.keys(record).every(key => allowed.has(key)));
  for (const key of ['session', 'turn', 'request', 'tool']) if (key in record) assert.ok(Number.isSafeInteger(record[key]));
}
assert.ok(!JSON.stringify(all).includes(secret));
assert.ok(!JSON.stringify(manifest).includes(secret));
assert.equal(sha256(inspect(root).bytes), sha256(before.bytes));
const evidence = {
  status: 'passed', scope: 'Offline extracted actual 0.87.1 correlation boundaries; no provider or installed activation',
  revision: manifest.revision, activationAllowed: false, t1Complete: false, node: process.version,
  originalHash: manifest.originalHash, patchedHash: manifest.patchedHash,
  sourceHashes: Object.fromEntries(['logger.mjs', 'stage.mjs', 'check-correlation.mjs'].map(name => [name, sha256(fs.readFileSync(new URL(name, import.meta.url)))])),
  boundaries: manifest.boundaries, events: all.length,
  checks: ['patched bundle syntax', 'concurrent sessions and requests', 'stable session across copied contexts', 'nested run restoration', 'initial user append before provider request', 'request through dispatch/handler/append/tool', 'tool ID reused across sessions remains isolated', 'response callbacks invoked externally retain request', 'turn snapshots survive deferred work', 'rejection/abort/error identity and pending handler', 'external abort correlates active scope and clears unrelated IDs', 'fixed schema and sentinel privacy', 'original/patched enabled/disabled microtask trace equality', 'installed SHA-256 unchanged'],
  command: ['node', 'packages/pi-harness/tools/pi-stall-diagnostics/check-correlation.mjs', root, evidencePath],
  correlation: requests.map(req => ({ session: req.session, turn: req.turn, request: req.request,
    events: first.filter(e => e.request === req.request).map(({ event, operation, handler, tool, status }) => ({ event, operation, handler, tool, status })) })),
  activeAbort: { session: activeAbortRecord.session, turn: activeAbortRecord.turn, request: activeAbortRecord.request },
  privacy: { sentinelAbsent: true, fixedSchema: true, opaqueNumericIds: true },
  asyncTrace: originalTrace,
  limitations: ['Extracted bundle functions run with fake surrounding dependencies; full CLI execution is not exercised here.', 'External abort omits unavailable or ambiguous turn/request IDs and does not guess a tool ID.', 'This correlation-only suite does not verify Google transport, performance or paired recovery; consult their separately recorded evidence.']
};
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: evidence.status, events: all.length, evidencePath }));
