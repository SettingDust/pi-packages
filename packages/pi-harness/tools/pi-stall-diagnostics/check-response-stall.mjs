import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

globalThis.fetch = () => { throw new Error('Offline fixture forbids global fetch'); };
assert.equal(process.versions.bun, '1.4.0', 'Run with the incident Bun 1.4.0');
const root = 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent/dist/bundle/chunks';
const { stream: baseline } = await import(pathToFileURL(path.join(root, 'openai-responses-HWEUZ6WZ.js')));
const model = { id: 'offline', name: 'offline', api: 'openai-responses', provider: 'offline', baseUrl: 'https://offline.invalid/v1', reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 64 };
const frame = new TextEncoder().encode('data: {"type":"response.completed","response":{"status":"completed","output":[]}}\n\n');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function bounded(promise, name) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(name + ': timeout')), 700); })]);
  } finally { clearTimeout(timer); }
}

async function run(name, adapter, { close = false, abort = false, cooperative = false, delayedCancel = false } = {}) {
  const user = new AbortController();
  let body, transport, fetches = 0, cancels = 0, releaseCancel;
  const cancelGate = delayedCancel ? new Promise(resolve => { releaseCancel = resolve; }) : undefined;
  const fakeFetch = async (_url, options) => {
    fetches++;
    transport = options.signal;
    const readable = new ReadableStream({
      start(controller) {
        body = controller;
        controller.enqueue(frame);
        if (close) controller.close();
      },
      cancel() { cancels++; return cancelGate; },
    });
    if (cooperative) transport.addEventListener('abort', () => { try { body.error(new DOMException('offline abort', 'AbortError')); } catch {} }, { once: true });
    return new Response(readable, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const events = [];
  let result, ended = false, thrown;
  const output = adapter(model, { messages: [] }, { apiKey: 'offline-placeholder', fetch: fakeFetch, signal: user.signal, maxRetries: 0, timeoutMs: 5000,
    onResponse: () => { assert.equal(transport.aborted, false); } });
  const resultTask = output.result().then(value => { result = value; });
  const consumer = (async () => { try { for await (const event of output) events.push(event.type); ended = true; } catch (e) { thrown = e; } })();
  try {
    await bounded((async () => { while (!events.includes('start')) await sleep(2); })(), name + ' start');
    if (abort) user.abort();
    await sleep(40);
    const beforeCleanup = { events: [...events], result: result?.stopReason ?? null, ended, signal: user.signal.aborted, transport: transport.aborted, cancels };
    assert.equal(fetches, 1, name + ' fake fetch count');
    assert.equal(transport.aborted, abort || (adapter !== baseline && !delayedCancel), name + ' transport signal');
    assert.equal(thrown, undefined, name + ' consumer error');
    if (close || (abort && cooperative) || (!delayedCancel && adapter !== baseline)) {
      assert.equal(ended, true, name + ' expected settlement');
      assert.equal(result?.stopReason, abort ? 'aborted' : 'stop', name + ' stop reason');
    } else {
      assert.equal(ended, false, name + ' expected pending iterator');
      assert.equal(result, undefined, name + ' expected pending result');
    }
    if (delayedCancel) {
      assert.equal(cancels, 1, 'early break must request iterator cleanup');
      releaseCancel();
    } else if (!ended) {
      try { body.close(); } catch {}
    }
    await bounded(Promise.all([resultTask, consumer]), name + ' cleanup');
    assert.equal(thrown, undefined);
    assert.equal(ended, true);
    assert.equal(result.stopReason, abort ? 'aborted' : 'stop');
    if (adapter !== baseline) assert.equal(transport.aborted, true, name + ' after cleanup transport signal');
    return { case: name, beforeCleanup, afterCleanup: { result: result.stopReason, ended, cancels } };
  } finally {
    releaseCancel?.();
    if (!ended) { try { body?.close(); } catch {} }
    await bounded(Promise.all([resultTask, consumer]), name + ' final cleanup');
  }
}

const cases = [];
cases.push(await run('terminal_then_EOF', baseline, { close: true }));
cases.push(await run('terminal_body_open', baseline));
cases.push(await run('abort_cooperative_body', baseline, { abort: true, cooperative: true }));
cases.push(await run('abort_noncooperative_body', baseline, { abort: true }));

// Diagnostic counterfactual only: change a disposable copy of the real consumer.
// A for-await break implicitly awaits every nested iterator.return().
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-response-stall-'));
try {
  const copy = path.join(temp, 'chunks');
  fs.cpSync(root, copy, { recursive: true });
  const file = path.join(copy, 'chunk-WIUZI2CJ.js');
  const source = fs.readFileSync(file, 'utf8');
  const old = 'else if(event.type==="response.completed"||event.type==="response.incomplete")finalizeResponse(event.response);';
  assert.equal(source.split(old).length, 2, 'consumer source guard');
  fs.writeFileSync(file, source.replace(old, 'else if(event.type==="response.completed"||event.type==="response.incomplete"){finalizeResponse(event.response);break}'));
  const { stream: earlyBreak } = await import(pathToFileURL(path.join(copy, 'openai-responses-HWEUZ6WZ.js')));
  cases.push(await run('early_break_cooperative_cancel', earlyBreak));
  cases.push(await run('early_break_waits_for_iterator_return', earlyBreak, { delayedCancel: true }));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log(JSON.stringify({ bun: process.versions.bun, installed: root, network: 'fake fetch only; global fetch forbidden', cases }, null, 2));
