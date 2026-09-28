import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const revision = 'offline-6-google';
export const gaps = ['Paired installer/recovery remains T1-P; activation remains disabled.'];
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function once(source, oldText, newText) {
  if (source.split(oldText).length !== 2) throw new Error('Selector is missing or ambiguous: ' + oldText.slice(0, 100));
  return source.replace(oldText, () => newText);
}
function span(source, start, end) {
  if (source.split(start).length !== 2 || source.split(end).length !== 2) throw new Error('Boundary is missing or ambiguous: ' + start);
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (b < a) throw new Error('Boundary ordering mismatch');
  return source.slice(a, b);
}
function wrap(body, prefix, suffix, family) {
  if (!body.startsWith(prefix) || !body.endsWith(suffix)) throw new Error('Unexpected boundary shape');
  return prefix + `const __sdOp=__sd.next();__sd.emit("${family}.enter",__sdOp);try{` + body.slice(prefix.length, -suffix.length) + `}catch(__sdError){__sd.emit("${family}.error",__sdOp);throw __sdError}finally{__sd.emit("${family}.exit",__sdOp)}` + suffix;
}
function wrapScope(body, prefix, suffix, values, tracked = false) {
  if (!body.startsWith(prefix) || !body.endsWith(suffix)) throw new Error('Unexpected scoped boundary shape');
  return prefix.replace(/^async /, "") + `return __sd.scope(${values},async()=>{` + (tracked ? "__sd.track();try{" : "") + body.slice(prefix.length, -suffix.length) + (tracked ? "}finally{__sd.untrack()}" : "") + `})` + suffix;
}
export function instrument(source, loggerSource) {
  if (source.includes('const __sd=')) throw new Error('Already instrumented');
  const boundaries = [];
  function change(start, end, transform) {
    const old = span(source, start, end);
    boundaries.push({ start, end, sha256: sha256(old) });
    source = once(source, old, transform(old));
  }
  for (const [start, end, prefix] of [
    ['async function runAgentLoop(', 'async function runAgentLoopContinue(', 'async function runAgentLoop(prompts,context,config,emit,signal,streamFn){'],
    ['async function runAgentLoopContinue(', 'function createAgentStream(', 'async function runAgentLoopContinue(context,config,emit,signal,streamFn){']
  ]) change(start, end, body => wrapScope(body, prefix, '}', '{session:__sd.session(config.sessionId),turn:__sd.next(),request:undefined,tool:undefined}', true));
  change('async function runLoop(initialContext,', 'function declareToolChanges(', body => {
    body = once(body, 'await emit({type:"turn_start"})', '(__sd.turn(),await emit({type:"turn_start"}))');
    return once(body, 'if(newMessages.push(message),', 'if(__sd.adopt(message),newMessages.push(message),');
  });
  change('async function streamAssistantResponse(', 'async function failToolCallsFromTruncatedMessage(', body => {
    const prefix = 'async function streamAssistantResponse(context,config,signal,emit,streamFunction){';
    body = once(body, 'response=await streamFunction(config.model,llmContext,{...config,apiKey:resolvedApiKey,signal})', 'response=(__sd.emit("provider.request",__sdOp),await __sd.provider(__sdOp,config.model.api,()=>streamFunction(config.model,llmContext,{...config,apiKey:resolvedApiKey,signal,onPayload:__sd.withoutGoogle(config.onPayload),onResponse:__sd.scopeResponse(function(...args){__sd.emit("provider.response",__sdOp,undefined,args[0]?.status);return __sd.withoutGoogle(config.onResponse)?.apply(this,args)})})))');
    body = once(body, 'case"done":case"error":{', 'case"done":case"error":{');
    body = once(body, 'let finalMessage2=await response.result();', 'let finalMessage2=await response.result();__sd.remember(finalMessage2);__sdTerminal=true;__sd.emit(event.type==="error"?"stream.error":"stream.end",__sdOp);');
    body = once(body, 'let finalMessage=await response.result();', 'let finalMessage=await response.result();__sd.remember(finalMessage);__sdTerminal=true;__sd.emit("stream.end",__sdOp);');
    body = wrap(body, prefix, '}', 'assistant');
    body = once(body, 'const __sdOp=__sd.next();', 'let __sdTerminal=false;const __sdOp=__sd.next();');
    body = once(body, 'catch(__sdError){', 'catch(__sdError){if(!__sdTerminal)__sd.emit("stream.error",__sdOp);');
    return wrapScope(body, prefix, '}', '{request:__sd.request(),tool:undefined,google:false}', true);
  });
  change('async emitMessageEnd(event){', 'async emitToolResult(', body => {
    body = once(body, 'handlerResult=await handler(currentEvent,ctx);', 'handlerResult=(__sd.emit("handler.enter",__sdOp,__sd.id(handler)),await handler(currentEvent,ctx));__sd.emit("handler.exit",__sdOp,__sd.id(handler));');
    body = once(body, 'catch(err2){', 'catch(err2){__sd.emit("handler.error",__sdOp,__sd.id(handler));');
    return wrap(body, 'async emitMessageEnd(event){', '}', 'message.dispatch');
  });
  change('appendMessage(message){', 'appendThinkingLevelChange(thinkingLevel){', body => {
    body = wrap(body, 'appendMessage(message){', '}', 'append');
    return 'appendMessage(message){return __sd.scope(__sd.owner(this.sessionId),()=>{' + body.slice('appendMessage(message){'.length, -1) + '})}';
  });
  change('async emitToolCall(event){', 'async emitUserBash(event){', body => {
    body = once(body, 'let handlerResult=await handler(event,ctx);', 'const __sdHook=__sd.next();__sd.emit("tool.hook.enter",__sdHook);let handlerResult;try{handlerResult=await handler(event,ctx)}catch(__sdError){__sd.emit("tool.hook.error",__sdHook);throw __sdError}finally{__sd.emit("tool.hook.exit",__sdHook)}');
    return wrapScope(wrap(body, 'async emitToolCall(event){', '}', 'tool.hooks'), 'async emitToolCall(event){', '}', '{tool:__sd.tool(event.toolCallId)}');
  });
  change('async function executePreparedToolCall(', 'async function finalizeExecutedToolCall(', body => {
    const prefix = 'async function executePreparedToolCall(prepared,signal,emit){';
    body = once(body, 'let updateEvents=[],acceptingUpdates=!0;', 'const __sdOp=__sd.next();__sd.emit("tool.execute.enter",__sdOp);let updateEvents=[],acceptingUpdates=!0;');
    body = once(body, 'finally{acceptingUpdates=!1}', 'finally{acceptingUpdates=!1;__sd.emit("tool.execute.exit",__sdOp)}');
    body = once(body, 'catch(error){', 'catch(error){__sd.emit("tool.execute.error",__sdOp);');
    return wrapScope(body, prefix, '}', '{tool:__sd.tool(prepared.toolCall.id)}');
  });
  change('async abort(){this._isAgentRunActive', 'async waitForIdle(){this.isIdle', body => wrapScope(wrap(body, 'async abort(){', '}', 'abort'), 'async abort(){', '}', '__sd.owner(this.sessionManager?.sessionId)'));
  const logger = loggerSource.replace('export function createDiagnostics', 'function createDiagnostics');
  const prelude = logger + '\nconst __sd=(()=>{try{return createDiagnostics(process.env.PI_STALL_LOG_DIR)}catch{return {emit(){},id(){},next(){},scope:(_,fn)=>fn(),provider:(_op,_api,fn)=>fn(),withoutGoogle:fn=>fn,turn(){},request(){},tool(){},session(){},owner(){return {}},remember(){},adopt(){},scopeResponse:fn=>fn,track(){},untrack(){}}}})();\n';
  return { source: prelude + source, boundaries };
}

export function inspect(root, allowedHash = '81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020') {
  root = fs.realpathSync(root);
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); }
  catch { throw new Error('Cannot read target package metadata'); }
  if (pkg.name !== '@earendil-works/pi-coding-agent' || pkg.version !== '0.87.1' || pkg.bin?.pi !== 'dist/bundle/cli.js') throw new Error('Unsupported package/version/entry');
  const entry = fs.readFileSync(path.join(root, pkg.bin.pi), 'utf8');
  if (!entry.includes('createRequire(import.meta.url)("./cli-runtime.js")')) throw new Error('Unrecognized CLI loader');
  const runtime = fs.readFileSync(path.join(root, 'dist/bundle/cli-runtime.js'), 'utf8');
  const imports = [...runtime.matchAll(/import\{APP_NAME,configureHttpDispatcher,main\}from"(\.\/chunks\/[^"/]+\.js)"/g)];
  if (imports.length !== 1) throw new Error('Ambiguous runtime mapping');
  const target = fs.realpathSync(path.join(root, 'dist/bundle', imports[0][1]));
  if (!target.startsWith(root + path.sep)) throw new Error('Target escapes installation');
  const bytes = fs.readFileSync(target);
  if (sha256(bytes) !== allowedHash) throw new Error('Unsupported bundle SHA-256; preserve unknown bytes');
  return { root, target, version: pkg.version, entryHash: sha256(entry), runtimeHash: sha256(runtime), bytes };
}
export function inspectGoogle(target) {
  const evidence = JSON.parse(fs.readFileSync(new URL('../../docs/works/pi-stall-diagnostics/evidence/google-http-0.87.1.json', import.meta.url), 'utf8'));
  if (target.entryHash !== 'e79626f2dd6f94aa45d30f3fa63cd84319a6eefcd150b353cfaf274366926774' ||
      target.runtimeHash !== '9ca136a7caa977d936aa789d7448a3dfb17851677ff5ac8c0dbcf23c31a02142') throw new Error('Entry/runtime hash drift');
  const sources = new Map();
  for (const file of evidence.files) {
    const resolved = fs.realpathSync(path.join(target.root, file.file));
    if (!resolved.startsWith(target.root + path.sep)) throw new Error('Google source escapes installation');
    const bytes = fs.readFileSync(resolved);
    if (sha256(bytes) !== file.sha256) throw new Error('Google source hash drift');
    sources.set(path.basename(file.file), { target: resolved, bytes });
  }
  for (const citation of evidence.citations) {
    if (sources.get(citation.file).bytes.toString('utf8').split(citation.excerpt).length !== 2) throw new Error('Google selector drift: ' + citation.symbol);
  }
  return { ...sources.get('chunk-FUXEF6JQ.js'), guards: evidence.files, citations: evidence.citations };
}

export function instrumentGoogle(source, citations) {
  const boundaries = [];
  const replace = (old, replacement) => {
    boundaries.push({ selector: old, sha256: sha256(old) });
    source = once(source, old, replacement);
  };
  // A private token is passed only by the two model-streaming call sites. Ambient
  // request context alone would include unrelated SDK and credential requests.
  for (const symbol of ['Vertex requestStream', 'Gemini requestStream']) {
    const old = citations.find(c => c.symbol === symbol).excerpt;
    replace(old, old.slice(0, -1) + ',__stallGoogleModel)');
  }
  replace('async requestStream(request){', 'async requestStream(request,__stallModel=undefined){');
  const call = 'this.streamApiCall(url,requestInit,request.httpMethod,patchedHttpOptions.retryOptions,patchedHttpOptions.timeout,request.abortSignal)';
  replace(call, call.slice(0, -1) + ',__stallModel)');
  const stream = span(source, 'async streamApiCall(', 'processStreamResponse(response){');
  replace(stream, once(once(stream,
    'async streamApiCall(url,requestInit,httpMethod,retryOptions,timeout,abortSignal){',
    'async streamApiCall(url,requestInit,httpMethod,retryOptions,timeout,abortSignal,__stallModel=undefined){'),
    'retryOptions,timeout,abortSignal).then', 'retryOptions,timeout,abortSignal,__stallModel).then'));
  replace('async apiCall(url,requestInit,retryOptions,timeout,abortSignal){',
    'async apiCall(url,requestInit,retryOptions,timeout,abortSignal,__stallModel=undefined){');
  const fetch = citations.find(c => c.symbol === 'actual fetch settlement').excerpt;
  replace(fetch, once(fetch, '))}catch(e)', '));if(__stallModel===__stallGoogleModel)__stallGoogleNotify(response)}catch(e)'));
  const prelude = `import { channel as __stallGoogleChannel } from 'node:diagnostics_channel';
const __stallGoogleModel={};
let __stallGoogleResponses;try{__stallGoogleResponses=__stallGoogleChannel('pi.stall.google.response.v1')}catch{}
function __stallGoogleNotify(response){try{if(!__stallGoogleResponses?.hasSubscribers)return;const status=response.status;if(Number.isInteger(status)&&status>=100&&status<=599)__stallGoogleResponses.publish(status)}catch{}}
`;
  return { source: prelude + source, boundaries };
}

export function stage(root, output) {
  const target = inspect(root), google = inspectGoogle(target);
  // Existing directory required so realpath resolves symlinks before any writes.
  output = fs.realpathSync(output);
  if (output === target.root || output.startsWith(target.root + path.sep)) throw new Error('Staging must be outside installation');
  const logger = fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8');
  const patched = instrument(target.bytes.toString('utf8'), logger);
  const sdk = instrumentGoogle(google.bytes.toString('utf8'), google.citations);
  const targets = [
    { target: target.target, original: target.bytes, patched, backupName: 'original.js', stagedName: 'patched.mjs' },
    { target: google.target, original: google.bytes, patched: sdk, backupName: 'google-original.js', stagedName: 'google-patched.mjs' }
  ].map(file => ({ target: file.target, originalHash: sha256(file.original), patchedHash: sha256(file.patched.source),
    backup: path.join(output, file.backupName), staged: path.join(output, file.stagedName), boundaries: file.patched.boundaries }));
  const manifest = { revision, activationAllowed: false, gaps, version: target.version, root: target.root,
    entryHash: target.entryHash, runtimeHash: target.runtimeHash, targets, sourceGuards: google.guards,
    // Main-only aliases serve extraction harnesses, never installer ownership.
    target: target.target, originalHash: targets[0].originalHash, patchedHash: targets[0].patchedHash, boundaries: patched.boundaries };
  // Exclusive writes: no overwrite of a previous stage or backup.
  for (const [i, file] of targets.entries()) {
    fs.writeFileSync(file.backup, i ? google.bytes : target.bytes, { flag: 'wx' });
    fs.writeFileSync(file.staged, i ? sdk.source : patched.source, { flag: 'wx' });
    if (sha256(fs.readFileSync(file.backup)) !== file.originalHash || sha256(fs.readFileSync(file.staged)) !== file.patchedHash) throw new Error('Stage verification failed');
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv[2] !== 'stage' || process.argv.length !== 5) throw new Error('Only staging is available: node stage.mjs stage TARGET_ROOT EXISTING_EMPTY_STAGE_DIR. Activation is blocked.');
  console.log(JSON.stringify(stage(process.argv[3], process.argv[4]), null, 2));
}
