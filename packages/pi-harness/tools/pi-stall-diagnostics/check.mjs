import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createDiagnostics } from './logger.mjs';
import { stage, inspect, sha256 } from './stage.mjs';
import { apply } from './install.mjs';

const [root, evidenceFile] = process.argv.slice(2);
assert.ok(root, 'Pass the explicit installed package root; it is only read.');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-stall-check-'));
const before = inspect(root);
const manifest = stage(root, work);
const patched = fs.readFileSync(path.join(work, 'patched.mjs'), 'utf8');
const syntax = spawnSync(process.execPath, ['--check', path.join(work, 'patched.mjs')], { encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr.slice(-2000));
const logs = path.join(work, 'logs'), diag = createDiagnostics(logs);
function records(dir = logs) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).flatMap(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(s => JSON.parse(s))).sort((a, b) => a.seq - b.seq);
  } catch (cause) { throw new Error('Diagnostic log verification failed', { cause }); }
}
function section(start, end) {
  if (start === 'async abort(){') start = 'abort(){return __sd.scope(__sd.owner';
  if (!patched.includes(start)) start = start.replace(/^async /, '');
  if (!patched.includes(end)) end = end.replace(/^async /, '');
  return patched.slice(patched.indexOf(start), patched.indexOf(end, patched.indexOf(start) + start.length));
}
const sentinel = 'PRIVATE_PROMPT_SUMMARY_PARAMETERS_BODY_HEADERS_CREDENTIAL_OUTPUT_STACK';
const error = new Error(sentinel);
const context = vm.createContext({ __sd: diag, normalizeContext: value => value, snapshotEventHandlers: extensions => extensions, generateId: () => 'fixture-id', createErrorToolResult: message => ({ message }) });
const assistant = vm.runInContext('(' + section('async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage(') + ')', context);
const Handler = vm.runInContext('(class {' + section('async emitMessageEnd(event){', 'async emitToolResult(') + '})', context);
const Append = vm.runInContext('(class {' + section('appendMessage(message){', 'appendThinkingLevelChange(thinkingLevel){') + '})', context);
const Hook = vm.runInContext('(class {' + section('async emitToolCall(event){', 'async emitUserBash(event){') + '})', context);
const tool = vm.runInContext('(' + section('async function executePreparedToolCall(', 'async function finalizeExecutedToolCall(') + ')', context);
const Abort = vm.runInContext('(class {' + section('async abort(){', 'async waitForIdle(){this.isIdle') + '})', context);
const message = { role: 'assistant', content: sentinel, stopReason: 'stop' };
const config = { model: { provider: 'fake' }, convertToLlm: value => value, onResponse: r => assert.equal(r.headers, sentinel) };
for (const terminal of ['done', 'error']) {
  const result = await assistant({ messages: [] }, config, undefined, async () => {}, async (_model, _ctx, options) => {
    options.onResponse({ status: 200, headers: sentinel });
    return { async *[Symbol.asyncIterator]() { yield { type: terminal }; }, result: async () => message };
  });
  assert.equal(result, message);
}
await assert.rejects(assistant({ messages: [] }, config, undefined, async () => {}, async () => { throw error; }), e => e === error);
const controller = new AbortController(); controller.abort(error);
await assert.rejects(assistant({ messages: [] }, config, controller.signal, async () => {}, async (_m, _c, o) => { o.signal.throwIfAborted(); }), e => e === error);
let release;
const pending = new Promise(resolve => { release = resolve; });
const order = [];
const handler = new Handler();
handler.createContext = () => ({});
handler.emitError = () => {};
handler.extensions = [{ ext: { path: sentinel }, handlers: [async () => { order.push(1); }, async () => { order.push(2); await pending; }] }];
const dispatch = handler.emitMessageEnd({ message });
await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(order, [1, 2]);
assert.equal(records().at(-1).event, 'handler.enter');
release(); await dispatch;
handler.extensions[0].handlers = [async () => { throw error; }];
await handler.emitMessageEnd({ message });
assert.ok(records().some(r => r.event === 'handler.error'));
const hook = new Hook(); hook.createContext = () => ({});
let releaseHook;
const hookPending = new Promise(resolve => { releaseHook = resolve; });
hook.extensions = [{ handlers: [async () => { await hookPending; return { block: true }; }] }];
const hookCall = hook.emitToolCall({ toolCallId: sentinel });
await new Promise(resolve => setImmediate(resolve));
assert.equal(records().at(-1).event, 'tool.hook.enter');
releaseHook(); assert.equal((await hookCall).block, true);
hook.extensions[0].handlers = [async () => { throw error; }];
await assert.rejects(hook.emitToolCall({}), e => e === error);
assert.equal(records().at(-1).event, 'tool.hooks.exit');
assert.ok(records().some(r => r.event === 'tool.hook.error'));
const append = new Append();
append.byId = new Map(); append._appendEntry = entry => assert.equal(entry.message, message);
assert.equal(append.appendMessage(message), 'fixture-id');
append._appendEntry = () => { throw error; };
assert.throws(() => append.appendMessage(message), e => e === error);
const prepared = { toolCall: { id: sentinel, arguments: sentinel, name: sentinel }, args: sentinel, tool: { execute: async () => message } };
assert.equal((await tool(prepared, undefined, async () => {})).result, message);
prepared.tool.execute = async () => { throw error; };
assert.equal((await tool(prepared, undefined, async () => {})).isError, true);
const abort = new Abort(); const abortOrder = [];
for (const key of ['abortRetry', 'abortCompaction', 'abortBranchSummary']) abort[key] = () => abortOrder.push(key);
abort.agent = { abort: () => abortOrder.push('agent') }; abort.waitForIdle = async () => abortOrder.push('idle');
await abort.abort(); assert.equal(abortOrder.join(','), 'abortRetry,abortCompaction,abortBranchSummary,agent,idle');
assert.ok(!JSON.stringify(records()).includes(sentinel));
assert.ok(!JSON.stringify(manifest).includes(sentinel));
const retained = path.join(work, 'retention');
const rotation = createDiagnostics(retained, { maxBytes: 1024 });
for (let i = 0; i < 100; i++) rotation.emit('append.enter', i);
assert.equal(fs.readdirSync(retained).length, 3);
for (const file of fs.readdirSync(retained)) assert.ok(fs.statSync(path.join(retained, file)).size <= 1024);
const invalid = path.join(work, 'not-directory'); fs.writeFileSync(invalid, 'fixture');
assert.doesNotThrow(() => createDiagnostics(invalid).emit('append.enter', 1));
const failure = createDiagnostics(path.join(work, 'write-failure')); failure.emit('append.enter', 1);
fs.rmSync(path.join(work, 'write-failure'), { recursive: true }); fs.writeFileSync(path.join(work, 'write-failure'), 'fixture');
assert.doesNotThrow(() => failure.emit('append.enter', 2));
const rotationFailureDir = path.join(work, 'rotation-failure');
const rotationFailure = createDiagnostics(rotationFailureDir, { maxBytes: 256 });
rotationFailure.emit('append.enter', 1);
const currentLog = fs.readdirSync(rotationFailureDir)[0];
fs.mkdirSync(path.join(rotationFailureDir, currentLog.replace('.0.jsonl', '.1.jsonl')));
assert.doesNotThrow(() => rotationFailure.emit('append.enter', 2));
assert.doesNotThrow(() => rotationFailure.emit('append.enter', 3));
assert.equal(fs.readFileSync(path.join(rotationFailureDir, currentLog), 'utf8').trim().split('\n').length, 1);
const isolation = path.join(work, 'isolation');
for (let i = 0; i < 2; i++) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import {createDiagnostics} from ${JSON.stringify(new URL('./logger.mjs', import.meta.url).href)};createDiagnostics(${JSON.stringify(isolation)}).emit('append.enter',1);`]);
  assert.equal(child.status, 0);
}
assert.equal(new Set(records(isolation).map(r => r.pid)).size, 2);
const benchDir = path.join(work, 'benchmark');
const benchmark = {};
for (const [name, dir] of [['off', undefined], ['on', benchDir]]) {
  const logger = createDiagnostics(dir), times = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    logger.emit('provider.request', i); logger.emit('provider.response', i, undefined, 200); logger.emit('stream.end', i); logger.emit('append.enter', i); logger.emit('append.exit', i);
    times.push(performance.now() - start);
  }
  times.sort((a,b) => a-b); benchmark[name] = { medianMs: times[500], p95Ms: times[950] };
}
benchmark.events = records(benchDir).length;
benchmark.bytes = fs.readdirSync(benchDir).reduce((sum, f) => sum + fs.statSync(path.join(benchDir, f)).size, 0);
assert.equal(benchmark.events, 5000);
assert.equal(sha256(inspect(root).bytes), sha256(before.bytes));
assert.throws(() => stage(root, work), /EEXIST/);
const fixture = path.join(work, 'fixture');
fs.cpSync(root, fixture, { recursive: true });
const fixtureStage = path.join(work, 'fixture-stage'); fs.mkdirSync(fixtureStage);
const fixtureManifest = stage(fixture, fixtureStage);
const fixtureTarget = fixtureManifest.target;
fs.symlinkSync(path.dirname(path.dirname(root)), path.join(work, 'node_modules'), 'junction');
assert.equal(apply(fixture, fixtureStage, 'install').hash, fixtureManifest.patchedHash);
const blocker = path.join(work, 'no-network.cjs');
fs.writeFileSync(blocker, `const deny=()=>{throw new Error('Offline smoke forbids network/process creation')};
globalThis.fetch=deny;
require('node:net').Socket.prototype.connect=deny;
require('node:tls').connect=deny;
for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])require('node:child_process')[name]=deny;
require('node:module').syncBuiltinESMExports();`);
const home = path.join(work, 'home'); fs.mkdirSync(home);
const smokeArgs = ['--require', blocker, path.join(fixture, 'dist/bundle/cli.js'), '--version'];
const smokeOptions = { cwd: home, encoding: 'utf8', timeout: 15000, env: {
  PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: work, TMP: work,
  HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home,
  PI_CODING_AGENT_DIR: path.join(home, 'agent'), NODE_DISABLE_COMPILE_CACHE: '1', NO_COLOR: '1'
} };
const smoke = spawnSync(process.execPath, smokeArgs, smokeOptions);
assert.deepEqual(fs.readdirSync(home), [], 'CLI must not create user state');
assert.equal(smoke.status, 0, smoke.stderr.slice(-2000));
assert.equal(smoke.stdout.trim(), manifest.version);
assert.equal(fs.readdirSync(path.join(work, 'logs')).filter(f => f.endsWith('.jsonl')).length > 0, true);
const installedStat = fs.statSync(fixtureTarget);
assert.equal(apply(fixture, fixtureStage, 'install').state, 'already-install');
assert.equal(fs.statSync(fixtureTarget).mtimeMs, installedStat.mtimeMs);
const backupPath = path.join(fixtureStage, 'original.js'), backup = fs.readFileSync(backupPath);
fs.writeFileSync(backupPath, 'drift');
assert.throws(() => apply(fixture, fixtureStage, 'rollback'), /Stage\/backup drift/);
assert.equal(sha256(fs.readFileSync(fixtureTarget)), fixtureManifest.patchedHash);
fs.writeFileSync(backupPath, backup);
fs.writeFileSync(fixtureTarget, 'drift');
for (const action of ['install', 'rollback']) assert.throws(() => apply(fixture, fixtureStage, action), /Unknown installed bytes/);
assert.equal(fs.readFileSync(fixtureTarget, 'utf8'), 'drift');
fs.writeFileSync(fixtureTarget, fs.readFileSync(path.join(fixtureStage, 'patched.mjs')));
assert.equal(apply(fixture, fixtureStage, 'rollback').hash, fixtureManifest.originalHash);
assert.equal(apply(fixture, fixtureStage, 'rollback').state, 'already-rollback');
assert.equal(sha256(fs.readFileSync(fixtureTarget)), manifest.originalHash);
const restoredSmoke = spawnSync(process.execPath, smokeArgs, smokeOptions);
assert.equal(restoredSmoke.status, 0, restoredSmoke.stderr);
assert.equal(restoredSmoke.stdout.trim(), manifest.version);
assert.deepEqual(fs.readdirSync(home), []);
assert.equal(sha256(inspect(root).bytes), manifest.originalHash);
const result = { status: 'passed', rollbackSmoke: restoredSmoke.stdout.trim(), isolatedHomeEmpty: true, networkAndChildProcessBlocked: true, finalDisposableHash: sha256(fs.readFileSync(fixtureTarget)), installerChecks: ['idempotence does not rewrite', 'backup drift refuses without mutation', 'install and rollback refuse unknown bytes without mutation', 'exact backup restoration', 'isolated restored CLI smoke'], stage: work, version: manifest.version, originalHash: manifest.originalHash, patchedHash: manifest.patchedHash, boundaries: manifest.boundaries.length, benchmark, activationAllowed: false, smoke: smoke.stdout.trim(), checks: 'syntax, extracted actual boundaries, stream success/error/reject/abort, pending second handler, append/error, tool hook wait/error, tool execute/error, abort order, sentinels, rotation, logger setup/write failure, process isolation, disposable install/idempotence/drift/rollback, patched provider-free CLI --version, unchanged installed hash' };
fs.writeFileSync(path.join(work, 'evidence.json'), JSON.stringify(result, null, 2));
if (evidenceFile) fs.writeFileSync(evidenceFile, JSON.stringify({ ...result, command: process.argv.slice(1), sourceHashes: Object.fromEntries(['check.mjs', 'stage.mjs', 'logger.mjs', 'install.mjs'].map(name => [name, sha256(fs.readFileSync(new URL(name, import.meta.url)))])) }, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
