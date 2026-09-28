import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { inspect, stage, sha256 } from './stage.mjs';
import { createDiagnostics } from './logger.mjs';
import { sdkRuntime, adapterCall } from './check-google.mjs';
import { inspectGoogle } from './stage.mjs';

const [root, evidenceFile] = process.argv.slice(2);
assert.ok(root && evidenceFile, 'Usage: node check-turns.mjs TARGET_ROOT EVIDENCE_JSON');
const before = inspect(root), work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-turns-'));
const manifest = stage(root, work), patched = fs.readFileSync(path.join(work, 'patched.mjs'), 'utf8');
// Same source-proven extracted boundaries as check-correlation; surrounding dependencies are fake.
function runtime(text, logger) {
  const scope = vm.createContext({ __sd: logger, normalizeContext: x => x, snapshotEventHandlers: x => x,
    generateId: () => 'fixture', createErrorToolResult: message => ({ message }), declareToolChanges: (_c, m) => m });
  for (const [name, start, end, method] of [
    ['runLoop', 'async function runLoop(initialContext,', 'function declareToolChanges('],
    ['streamAssistantResponse', 'async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage('],
    ['runAgentLoop', 'async function runAgentLoop(', 'async function runAgentLoopContinue('],
    ['executePreparedToolCall', 'async function executePreparedToolCall(', 'async function finalizeExecutedToolCall('],
    ['Handler', 'async emitMessageEnd(event){', 'async emitToolResult(', true],
    ['Append', 'appendMessage(message){', 'appendThinkingLevelChange(', true],
    ['Hook', 'async emitToolCall(event){', 'async emitUserBash(', true]
  ]) {
    const aText = text.includes(start) ? start : start.replace(/^async /, '');
    const bText = text.includes(end) ? end : end.replace(/^async /, '');
    const a = text.indexOf(aText), b = text.indexOf(bText, a + aText.length);
    assert.ok(a >= 0 && b > a, name);
    const body = text.slice(a, b);
    scope[name] = vm.runInContext(method ? '(class {' + body + '})' : '(' + body + ')', scope);
  }
  return scope;
}
function fixture(text, logger, google) {
  const rt = runtime(text, logger);
  const handler = new rt.Handler(); handler.createContext = () => ({}); handler.emitError = () => {};
  handler.extensions = [{ handlers: [async () => {}, async () => {}] }];
  const append = new rt.Append(); append.sessionId = google?.api || 'synthetic'; append.byId = new Map(); append._appendEntry = () => {};
  const hook = new rt.Hook(); hook.createContext = () => ({}); hook.extensions = [{ handlers: [async () => ({ block: false })] }];
  const emit = async e => { if (e.type === 'message_end') { await handler.emitMessageEnd(e); append.appendMessage(e.message); } };
  const config = { sessionId: google?.api || 'synthetic', model: { provider: 'fake', api: google?.api }, convertToLlm: x => x };
  let attempt = 0;
  const sdk = google && sdkRuntime(google.text, async () => {
    const status = google.retry && attempt++ === 0 ? 503 : 200;
    return { status, ok: status === 200, failure: new Error('synthetic retry') };
  }, { vertex: google.api === 'google-vertex', retryOptions: google.retry ? { attempts: 2 } : undefined });
  rt.executeToolCalls = async (_c, message, _config, signal, event) => {
    for (const toolCall of message.content) {
      await hook.emitToolCall({ toolCallId: toolCall.id });
      const result = await rt.executePreparedToolCall({ toolCall, args: {}, tool: { execute: async () => 'ok' } }, signal, event);
      assert.equal(result.result, 'ok');
    }
    return { messages: [], terminate: true };
  };
  const provider = async (_m, _c, options) => {
    if (google) {
      attempt = 0;
      await adapterCall(google.excerpt, { models: { generateContentStream: p => sdk.model.generateContentStreamInternal(p) } }, sdk.params, config.model, options);
    } else options.onResponse?.({ status: 200 });
    return { async *[Symbol.asyncIterator]() { for (let i = 0; i < 32; i++) yield { type: 'text_delta', delta: 'fake' }; yield { type: 'done' }; },
      result: async () => ({ role: 'assistant', content: [1, 2].map(id => ({ type: 'toolCall', id: String(id), name: 'fake', arguments: {} })), stopReason: 'stop' }) };
  };
  return () => rt.runAgentLoop([{ role: 'user', content: [] }], { messages: [] }, config, emit, undefined, provider);
}
const modes = [
  { name: 'baseline', text: before.bytes.toString(), logger: undefined },
  { name: 'patchedDisabled', text: patched, logger: createDiagnostics(undefined) },
  { name: 'patchedEnabled', text: patched, logger: createDiagnostics(path.join(work, 'logs')) }
];
for (const mode of modes) { mode.turn = fixture(mode.text, mode.logger); mode.times = []; }
const samples = 200, warmup = 20;
for (let i = 0; i < warmup + samples; i++) {
  // Rotate order to reduce systematic cache/scheduling bias. All modes do identical work.
  for (let j = 0; j < modes.length; j++) {
    const mode = modes[(i + j) % modes.length], start = performance.now();
    const result = await mode.turn();
    const elapsed = performance.now() - start;
    assert.equal(result.length, 2);
    if (i >= warmup) mode.times.push(elapsed);
  }
}
const records = fs.readdirSync(path.join(work, 'logs')).flatMap(f => fs.readFileSync(path.join(work, 'logs', f), 'utf8').trim().split('\n'));
const parsed = records.map(JSON.parse);
assert.equal(parsed.length, 33 * (samples + warmup), 'Boundaries only; no per-token events');
assert.equal(parsed.filter(e => e.event === 'provider.request').length, samples + warmup);
assert.equal(parsed.filter(e => e.event === 'tool.execute.exit').length, 2 * (samples + warmup));
assert.equal(parsed.filter(e => e.event === 'handler.enter').length, 4 * (samples + warmup));
assert.equal(parsed.filter(e => e.event === 'provider.response').length, samples + warmup);
const measured = records.filter((_, i) => parsed[i].turn > parsed.filter(e => e.event === 'provider.request')[warmup - 1].turn);
assert.equal(measured.length, 33 * samples);
const counts = lines => ({ events: lines.length, bytes: lines.reduce((n, line) => n + Buffer.byteLength(line + '\n'), 0) });
const timing = Object.fromEntries(modes.map(mode => {
  mode.times.sort((a, b) => a - b);
  return [mode.name, { medianMs: mode.times[Math.ceil(samples / 2) - 1], p95Ms: mode.times[Math.ceil(samples * .95) - 1], ...(mode.name === 'patchedEnabled' ? counts(measured) : { events: 0, bytes: 0 }) }];
}));
const googleSource = inspectGoogle(before);
const sdkPatched = fs.readFileSync(manifest.targets[1].staged, 'utf8');
const googleMeasurements = [];
for (const scenario of ['success', 'retry', 'concurrent', 'rotation']) {
  const scenarioModes = ['baseline', 'patchedDisabled', 'patchedEnabled'].map(name => {
    const directory = path.join(work, scenario + '-' + name);
    const logger = name === 'baseline' ? undefined : createDiagnostics(name === 'patchedEnabled' ? directory : undefined,
      scenario === 'rotation' ? { maxBytes: 4096, files: 3 } : {});
    const make = api => fixture(name === 'baseline' ? before.bytes.toString() : patched, logger, {
      api, text: name === 'baseline' ? googleSource.bytes.toString() : sdkPatched,
      retry: scenario === 'retry' || (scenario === 'concurrent' && api === 'google-generative-ai'),
      excerpt: googleSource.citations.find(c => c.symbol === 'Payload callback and SDK call' && c.file.startsWith(api === 'google-vertex' ? 'google-vertex' : 'google-generative')).excerpt
    });
    const first = make('google-generative-ai'), second = scenario === 'concurrent' ? make('google-vertex') : undefined;
    return { name, directory, times: [], turn: second ? () => Promise.all([first(), second()]) : first, events: 0, bytes: 0, rotationSamples: [], sinkTimes: [] };
  });
  const n = scenario === 'rotation' ? 50 : samples;
  // Count exactly the lines submitted to the synchronous sink, including those
  // subsequently rotated out. This observer adds constant test-only call cost.
  const append = fs.appendFileSync, rename = fs.renameSync, mkdir = fs.mkdirSync, rm = fs.rmSync;
  let measuring, rotated = false, sinkMs = 0;
  function sink(callback) { const start = performance.now(); try { return callback(); } finally { if (measuring) sinkMs += performance.now() - start; } }
  fs.appendFileSync = function(file, line, ...args) {
    if (measuring) { measuring.events++; measuring.bytes += Buffer.byteLength(line); }
    return sink(() => append.call(this, file, line, ...args));
  };
  fs.mkdirSync = function(...args) { return sink(() => mkdir.apply(this, args)); };
  fs.rmSync = function(...args) { return sink(() => rm.apply(this, args)); };
  fs.renameSync = function(...args) { if (measuring) rotated = true; return sink(() => rename.apply(this, args)); };
  try {
    for (let i = 0; i < warmup + n; i++) for (let j = 0; j < scenarioModes.length; j++) {
      const mode = scenarioModes[(i + j) % scenarioModes.length];
      measuring = i >= warmup ? mode : undefined; rotated = false; sinkMs = 0;
      const start = performance.now(); await mode.turn(); const elapsed = performance.now() - start;
      measuring = undefined;
      if (i >= warmup) { mode.times.push(elapsed); mode.sinkTimes.push(sinkMs); if (rotated) mode.rotationSamples.push(elapsed); }
    }
  } finally { fs.appendFileSync = append; fs.renameSync = rename; fs.mkdirSync = mkdir; fs.rmSync = rm; }
  const stats = values => {
    values.sort((a, b) => a - b);
    return values.length ? { samples: values.length, medianMs: values[Math.ceil(values.length / 2) - 1], p95Ms: values[Math.ceil(values.length * .95) - 1] } : null;
  };
  const eventsPerSample = scenario === 'retry' ? 34 : scenario === 'concurrent' ? 67 : 33;
  const timing = Object.fromEntries(scenarioModes.map(mode => {
    assert.equal(mode.events, mode.name === 'patchedEnabled' ? n * eventsPerSample : 0);
    if (scenario === 'rotation' && mode.name === 'patchedEnabled') {
      assert.equal(fs.readdirSync(mode.directory).length, 3);
      for (const file of fs.readdirSync(mode.directory)) assert.ok(fs.statSync(path.join(mode.directory, file)).size <= 4096);
      assert.ok(mode.rotationSamples.length > 0);
    }
    return [mode.name, { ...stats(mode.times), events: mode.events, bytes: mode.bytes, synchronousSink: stats(mode.sinkTimes), rotationLatency: stats(mode.rotationSamples) }];
  }));
  googleMeasurements.push({ scenario, samplesPerMode: n, warmupPerMode: warmup, eventsPerEnabledSample: eventsPerSample, timing,
    overhead: { enabledMedianMs: timing.patchedEnabled.medianMs - timing.baseline.medianMs, enabledP95Ms: timing.patchedEnabled.p95Ms - timing.baseline.p95Ms,
      disabledMedianMs: timing.patchedDisabled.medianMs - timing.baseline.medianMs, disabledP95Ms: timing.patchedDisabled.p95Ms - timing.baseline.p95Ms } });
  fs.writeFileSync(evidenceFile, JSON.stringify({ status: 'running', activationAllowed: false, googleMeasurements }, null, 2) + '\n');
}
assert.equal(sha256(inspect(root).bytes), manifest.originalHash);
assert.equal(sha256(inspectGoogle(inspect(root)).bytes), manifest.targets[1].originalHash);
const result = { status: 'passed', googleMeasurements, targets: manifest.targets, activationAllowed: false, t1Complete: false, revision: manifest.revision,
  command: ['node', 'packages/pi-harness/tools/pi-stall-diagnostics/check-turns.mjs', root, evidenceFile],
  environment: { node: process.version, platform: process.platform, arch: process.arch, os: os.release(), cpu: os.cpus()[0].model, cpus: os.cpus().length },
  originalHash: manifest.originalHash, patchedHash: manifest.patchedHash,
  sourceHashes: Object.fromEntries(['stage.mjs', 'logger.mjs', 'check-turns.mjs', 'check-google.mjs'].map(name => [name, sha256(fs.readFileSync(new URL(name, import.meta.url)))])),
  workload: { samplesPerMode: samples, warmupPerMode: warmup, streamsPerTurn: 1, deltasPerStream: 32, messageDispatches: 2, handlersPerDispatch: 2, appends: 2, tools: 2, hooksPerTool: 1, order: 'interleaved rotating' },
  timing, totalEnabledIncludingWarmup: counts(records),
  overhead: { medianAddedMs: timing.patchedEnabled.medianMs - timing.baseline.medianMs, p95AddedMs: timing.patchedEnabled.p95Ms - timing.baseline.p95Ms, medianRatio: timing.patchedEnabled.medianMs / timing.baseline.medianMs },
  limitations: ['Synthetic extracted full loop with fake dependencies, not real provider latency or complete CLI throughput.', 'Synchronous metadata writes are included; no artificial provider/network wait.', 'Google scenarios include constant test-only sink observers to count rotated events/bytes and time append/mkdir/rm/rename calls; reduced 4 KiB retention cap forces rotation.', 'No activation approval or real-provider latency claim is implied.'] };
fs.writeFileSync(evidenceFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
