// One-shot Bun JavaScriptCore inspector snapshot; output only bounded metadata.
const [url, expectedPid, session] = process.argv.slice(2);
if (!url || !expectedPid || !session) throw new Error('usage: node capture-stack.mjs ws-url pid session');

const socket = new WebSocket(url);
const pending = new Map();
let id = 0;
let enableSent = false;
let pauseSent = false;
let paused = false;
let resumed = false;
let disabled = false;
let pauseEvent;
let receivePause;
const event = new Promise(resolve => { receivePause = resolve; });
const deadline = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
]);
const rpc = (method, params = {}) => {
  const requestId = ++id;
  const response = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return deadline(response, 1000, method);
};
const stackFrames = stack => {
  const result = [];
  for (let depth = 0; stack && depth < 4; depth++, stack = stack.parent) {
    result.push({ frames: (stack.callFrames || []).slice(0, 24).map(f => ({
      functionName: f.functionName || '', url: (f.url || '').split(/[?#]/)[0].replace(/:\/\/[^/@]*@/, '://[redacted]@'),
      lineNumber: f.lineNumber, columnNumber: f.columnNumber,
    })) });
  }
  return result;
};
socket.addEventListener('message', ({ data }) => {
  let message;
  try { message = JSON.parse(data); } catch { return; }
  if (message.id !== undefined) {
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`inspector error ${message.error.code}`));
      else waiter.resolve(message.result);
    }
  } else if (message.method === 'Debugger.paused') {
    paused = true;
    const p = message.params || {};
    pauseEvent = { reason: p.reason, frames: (p.callFrames || []).slice(0, 24).map(f => ({
      functionName: f.functionName || '', url: (f.url || '').split(/[?#]/)[0].replace(/:\/\/[^/@]*@/, '://[redacted]@'),
      lineNumber: f.location?.lineNumber, columnNumber: f.location?.columnNumber, scriptId: f.location?.scriptId,
    })), asyncStackTrace: stackFrames(p.asyncStackTrace) };
    receivePause();
  }
});

const result = { endpoint: url, expectedPid: Number(expectedPid), session, pauseSent: false };
try {
  await deadline(new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  }), 1500, 'connect');
  const identity = (await rpc('Runtime.evaluate', { expression: '({pid:process.pid,version:Bun.version,argv:process.argv})', returnByValue: true }))?.result?.value;
  result.identity = { pid: identity?.pid, version: identity?.version, sessionMatch: identity?.argv?.includes(session) };
  if (identity?.pid !== Number(expectedPid) || !result.identity.sessionMatch) throw new Error('identity mismatch');
  enableSent = true;
  await rpc('Debugger.enable');
  // No breakpoints or async recording: capture only ancestry already attached to the event.
  const pauseAck = rpc('Debugger.pause');
  pauseAck.then(() => { result.pauseAcknowledged = true; }, error => { result.pauseError = error.message; });
  pauseSent = result.pauseSent = true;
  await deadline(event, 800, 'paused event');
  result.stack = pauseEvent;
} catch (error) {
  result.error = error.message;
} finally {
  // Resume and disable even when no pause arrives; verify queued-pause cleanup in a disposable Bun fixture.
  if (enableSent || pauseSent || paused) {
    try { await rpc('Debugger.resume'); resumed = true; } catch (error) {
      result.resumeError = error.message;
      try { await rpc('Debugger.resume'); resumed = true; } catch (retry) { result.resumeRetryError = retry.message; }
    }
    try { await rpc('Debugger.disable'); disabled = true; } catch (error) {
      result.disableError = error.message;
      try { await rpc('Debugger.disable'); disabled = true; } catch (retry) { result.disableRetryError = retry.message; }
    }
  }
  result.paused = paused;
  result.resumeAcknowledged = resumed;
  result.disableAcknowledged = disabled;
  if (socket.readyState === WebSocket.OPEN && result.identity?.pid === Number(expectedPid)) {
    try {
      const check = await rpc('Runtime.evaluate', { expression: 'process.pid', returnByValue: true });
      result.recoveryEvaluation = check?.result?.value === Number(expectedPid);
    } catch (error) { result.recoveryError = error.message; }
  }
  socket.close();
  console.log(JSON.stringify(result, null, 2));
}
