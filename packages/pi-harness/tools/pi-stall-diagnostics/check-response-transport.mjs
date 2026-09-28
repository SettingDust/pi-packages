import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isReadable } from 'node:stream';
const guardProbe = process.argv.includes('--readable-guard-probe');
assert.ok(!guardProbe || process.argv.includes('--pi-fetch'), 'guard probe requires Pi transport');
const root = 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent/dist/bundle/chunks';
const { OpenAI } = await import(pathToFileURL(path.join(root, 'chunk-NUHFSC37.js')));
const { stream: pi } = await import(pathToFileURL(path.join(root, 'openai-responses-HWEUZ6WZ.js')));
let dispatcher;
if (process.argv.includes('--pi-fetch')) {
  // Only this disposable process: exclude ambient proxy settings from loopback tests.
  for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete process.env[name];
  process.env.NO_PROXY = process.env.no_proxy = '*';
  const { configureHttpDispatcher } = await import(pathToFileURL(path.join(root, 'chunk-OJP47DM6.js')));
  configureHttpDispatcher();
  const { getGlobalDispatcher } = await import(pathToFileURL('D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/undici/index.js'));
  dispatcher = getGlobalDispatcher();
}
const nativeFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Only explicit loopback fetch allowed'); };
const delay = ms => new Promise(r => setTimeout(r, ms));
async function bounded(p, ms = 1500) {
  let timer;
  try { return await Promise.race([p, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('fixture timeout')), ms); })]); }
  finally { clearTimeout(timer); }
}
const frame = type => `event: ${type}\ndata: ${JSON.stringify({ type, response: { id: 'resp_local', object: 'response', status: type === 'response.failed' ? 'failed' : type === 'response.created' ? 'in_progress' : 'completed', output: [], error: type === 'response.failed' ? { code: 'server_error', message: 'local fixture' } : null }, ...(type === 'error' ? { code: 'server_error', message: 'local fixture' } : {}) })}\n\n`;
const model = { id: 'local', name: 'local', api: 'openai-responses', provider: 'local', reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 64 };
async function run(layer, mode, scenario, adapter = pi) {
  const sockets = new Set(), user = new AbortController(), began = performance.now();
  const ms = () => Math.round((performance.now() - began) * 10) / 10;
  const trace = [], record = (event, extra = {}) => trace.push({ event, ms: ms(), ...extra });
  let res, signal, settled = false, outcome, resultTask, task, reads = 0;
  const server = http.createServer((req, response) => {
    req.resume(); res = response;
    response.on('close', () => record('server.response.close'));
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    response.write(frame(scenario === 'abort_before_completion' ? 'response.created' : scenario === 'failed_open' ? 'response.failed' : scenario === 'error_open' ? 'error' : 'response.completed'));
    if (scenario === 'done_open') response.write('data: [DONE]\n\n');
    if (scenario === 'eof') response.end();
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await bounded(new Promise(resolve => server.listen(0, '127.0.0.1', resolve)));
  const baseURL = `http://127.0.0.1:${server.address().port}/v1`;
  const fetch = async (url, options) => {
    assert.equal(new URL(url).origin, new URL(baseURL).origin);
    signal = options.signal;
    signal.addEventListener('abort', () => record('fetch.signal.abort'), { once: true });
    const response = await nativeFetch(url, { ...options, redirect: 'error' });
    record('headers');
    const body = response.body;
    if (guardProbe) {
      record('readable.guard.before', { value: isReadable(body) });
      // Diagnostic counterfactual only: this live body is readable at headers.
      // Not a polyfill: this marker deliberately does not track later stream state.
      body[Symbol.for('nodejs.stream.readable')] = true;
      record('readable.guard.after', { value: isReadable(body) });
    }
    const wrap = (owner, method) => async (...args) => {
      record(method + '.enter');
      try { const value = await owner[method](...args); record(method + '.settle', { done: value?.done }); if ((method === 'read' || method === 'next') && !value?.done) reads++; return value; }
      catch (e) { record(method + '.reject', { name: e.name }); throw e; }
    };
    const wrapped = mode === 'native' ? {
      [Symbol.asyncIterator]() { const iterator = body[Symbol.asyncIterator](); return { next: wrap(iterator, 'next'), return: wrap(iterator, 'return'), [Symbol.asyncIterator]() { return this; } }; }
    } : { getReader() { const reader = body.getReader(); return { read: wrap(reader, 'read'), cancel: wrap(reader, 'cancel'), releaseLock: () => reader.releaseLock() }; } };
    Object.defineProperty(response, 'body', { value: wrapped });
    return response;
  };
  try {
    task = (async () => {
      try {
        if (layer === 'pi' || layer === 'pi_break') {
          const output = adapter({ ...model, baseUrl: baseURL }, { messages: [] }, { apiKey: 'local-placeholder', fetch, signal: user.signal, maxRetries: 0, timeoutMs: 5000 });
          resultTask = output.result();
          for await (const event of output) record('pi.' + event.type);
          outcome = (await resultTask).stopReason;
        } else if (layer === 'sdk') {
          const client = new OpenAI({ apiKey: 'local-placeholder', baseURL, fetch, maxRetries: 0, timeout: 5000 });
          const stream = await client.responses.create({ model: 'local', input: [], stream: true }, { signal: user.signal });
          for await (const event of stream) { record('sdk.' + event.type); if (scenario === 'break_open') break; }
          outcome = 'end';
        } else {
          const response = await fetch(baseURL + '/responses', { signal: user.signal });
          const iterable = mode === 'native' ? response.body : { async *[Symbol.asyncIterator]() { const reader = response.body.getReader(); let done = false; try { while (true) { const item = await reader.read(); if (item.done) { done = true; return; } yield item.value; } } finally { if (!done) await reader.cancel(); reader.releaseLock(); } } };
          for await (const _chunk of iterable) { record('bare.chunk'); if (scenario === 'break_open') break; }
          outcome = 'end';
        }
      } catch (e) { outcome = e.name; }
      settled = true; record('settled', { outcome });
    })();
    await bounded((async () => { while (!reads && !settled) await delay(2); })());
    await delay(100);
    const before = { settled, outcome: outcome ?? null, transportAborted: signal?.aborted ?? null };
    if (!settled) {
      if (scenario === 'disconnect') { record('server.destroy'); res.destroy(); }
      else { record('user.abort'); user.abort(); }
    }
    let timedOut = false;
    try { await bounded(task); } catch { timedOut = true; }
    await delay(30);
    const after = { settled, outcome: outcome ?? null, transportAborted: signal?.aborted ?? null, timedOut };
    if (scenario === 'eof') assert.equal(outcome, layer.startsWith('pi') ? 'stop' : 'end');
    return { layer, mode, scenario, before, after, trace };
  } catch (e) {
    return { layer, mode, scenario, fixtureError: e.message, trace };
  } finally {
    user.abort(); res?.destroy();
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections();
    await bounded(new Promise(resolve => server.close(resolve)));
    if (task) { try { await bounded(task); } catch { record('cleanup.task.pending'); } }
  }
}
const cases = [];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-loopback-stall-'));
try {
  const copy = path.join(temp, 'chunks'); fs.cpSync(root, copy, { recursive: true });
  const file = path.join(copy, 'chunk-WIUZI2CJ.js'), source = fs.readFileSync(file, 'utf8');
  const old = 'else if(event.type==="response.completed"||event.type==="response.incomplete")finalizeResponse(event.response);';
  assert.equal(source.split(old).length, 2);
  fs.writeFileSync(file, source.replace(old, 'else if(event.type==="response.completed"||event.type==="response.incomplete"){finalizeResponse(event.response);break}'));
  const { stream: earlyBreak } = await import(pathToFileURL(path.join(copy, 'openai-responses-HWEUZ6WZ.js')));
  for (const mode of ['native', 'fallback']) {
    for (const layer of ['bare', 'sdk', 'pi']) {
      for (const scenario of guardProbe ? ['completed_open', 'abort_before_completion', 'disconnect'] : ['completed_open', 'eof', 'abort_before_completion', 'disconnect', 'failed_open', 'error_open', 'done_open', ...(layer === 'pi' ? [] : ['break_open'])]) cases.push(await run(layer, mode, scenario));
    }
    if (!guardProbe) cases.push(await run('pi_break', mode, 'completed_open', earlyBreak));
  }
  assert.ok(cases.every(c => !c.fixtureError), 'fixture execution error');
  if (guardProbe) assert.ok(cases.every(c => c.after.settled && !c.after.timedOut), 'guard counterfactual must settle all pending reads');
  console.log(JSON.stringify({ guardProbe, runtime: process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.version}`, platform: process.platform, pi: '0.87.1', sdk: '6.40.0', transport: dispatcher ? 'Pi configureHttpDispatcher / bundled undici 8.10.2' : 'runtime native fetch', network: 'HTTP/1.1 loopback only', observationMs: 100, settlementBoundMs: 1500, cases }, null, 2));
} finally { fs.rmSync(temp, { recursive: true, force: true }); if (dispatcher) { try { await bounded(dispatcher.destroy()); } catch { console.error('dispatcher.destroy exceeded 1500ms after socket cleanup'); } } }
