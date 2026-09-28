import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { channel } from 'node:diagnostics_channel';
import { awaitLogger, makeAwaitPublisher } from './awaits.mjs';

export async function runAwaitChecks(work, manifest) {
  const loggerFile = path.join(work, 'await-logger.mjs');
  fs.writeFileSync(loggerFile, awaitLogger(fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8')));
  const { createDiagnostics } = await import(pathToFileURL(loggerFile));
  const directory = path.join(work, 'runtime-logs');
  const diag = createDiagnostics(directory, { maxBytes: 1800, files: 3 });
  const pub = makeAwaitPublisher(channel);
  const read = () => fs.existsSync(directory) ? fs.readdirSync(directory).flatMap(f => fs.readFileSync(path.join(directory, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).sort((a,b)=>a.seq-b.seq) : [];
  const tick = ms => new Promise(resolve => setTimeout(resolve, ms));
  let request;
  await diag.scope({request:1,session:2,turn:3}, async()=>{
    diag.awaitTrack(4); request=pub.capture(); assert.equal(request,1);
    assert.equal(pub.capture('sdk'),undefined);
    diag.provider(4,'openai-responses',()=>{assert.equal(pub.capture('sdk'),1);diag.withoutGoogle(()=>assert.equal(pub.capture('sdk'),undefined))()});
    const slot=pub.start('callback',request);
    await tick(2150);
    assert(read().filter(r=>r.event==='await.snapshot').length>=2);
    assert(read().every(r=>r.summary.pending.some(p=>p.phase==='callback')));
    for(let i=0;i<30;i++)diag.awaitSnapshot();
    assert(read().at(-1).summary.pending.some(p=>p.slot===slot));
    assert(fs.readdirSync(directory).length<=3);
    pub.end(request,slot);diag.awaitSnapshot();assert.equal(read().at(-1).summary.pending.length,0);
    for(let i=0;i<40;i++)pub.start('body.next',request);
    diag.awaitSnapshot(); // Large cap snapshots exceed this test sink; use a separate default sink below.
    diag.awaitUntrack();
  });
  assert.equal(pub.capture(),undefined);
  assert.equal(channel('pi.stall.await.v1').hasSubscribers,false);
  const capDir=path.join(work,'caps'), cap=createDiagnostics(capDir);
  const scopes=[];
  for(let i=1;i<=129;i++)cap.scope({request:i,session:1,turn:i},()=>{cap.awaitTrack(i);scopes.push(cap.scopeResponse(()=>cap.awaitUntrack()))});
  cap.scope({request:1},()=>{for(let i=0;i<40;i++)pub.start('body.next',1);cap.awaitSnapshot()});
  let capRecord;
  try { capRecord=JSON.parse(fs.readFileSync(path.join(capDir,fs.readdirSync(capDir)[0]),'utf8').trim()); }
  catch { throw new Error('Cap evidence was not valid JSON'); }
  assert.equal(capRecord.summary.pending.length,32);assert(capRecord.summary.overflow);
  assert(Buffer.byteLength(JSON.stringify(capRecord.summary))<=16384);
  cap.scope({request:129},()=>assert.equal(pub.capture(),undefined));
  for(const finish of scopes.slice(0,128))finish();
  assert.equal(channel('pi.stall.await.v1').hasSubscribers,true);
  await tick(1050);
  const overflowRecords=fs.readdirSync(capDir).flatMap(f=>fs.readFileSync(path.join(capDir,f),'utf8').trim().split('\n').map(JSON.parse));
  assert(overflowRecords.some(r=>r.summary?.reason==='overflow'&&r.summary.rejected===1));
  scopes[128]();
  const progressDir=path.join(work,'progress'),progress=createDiagnostics(progressDir);
  progress.scope({request:300},()=>{progress.awaitTrack(1);for(let i=0;i<1000002;i++){const slot=pub.start('body.next',300);pub.end(300,slot)}progress.awaitSnapshot();progress.awaitUntrack()});
  const progressRecords=fs.readdirSync(progressDir).flatMap(f=>fs.readFileSync(path.join(progressDir,f),'utf8').trim().split('\n').map(JSON.parse));
  assert.equal(progressRecords[0].summary.progress['body.next'],1000000);assert.equal(progressRecords[0].summary.pending.length,0);assert.equal(progressRecords.length,2);
  assert.equal(channel('pi.stall.await.v1').hasSubscribers,false);
  const disabled=createDiagnostics();disabled.scope({request:1},()=>{disabled.awaitTrack(1);assert.equal(pub.capture(),undefined);disabled.awaitUntrack()});
  const broken=path.join(work,'not-a-directory');fs.writeFileSync(broken,'fixture');
  const failed=createDiagnostics(broken);failed.scope({request:1},()=>{failed.awaitTrack(1);failed.awaitSnapshot();failed.awaitUntrack()});
  assert.equal(channel('pi.stall.await.v1').hasSubscribers,false);
  const throwing=makeAwaitPublisher(()=>({hasSubscribers:true,publish(){throw new Error('sentinel-secret')}}));
  assert.equal(throwing.capture(),undefined);throwing.start('callback',1);
  const bad=makeAwaitPublisher(()=>{throw new Error('sentinel-secret')});assert.equal(bad.capture(),undefined);
  // A malicious getter must be contained inside the owned subscriber.
  const privacyDir=path.join(work,'privacy'), privacy=createDiagnostics(privacyDir);
  privacy.scope({request:1,session:1,turn:1},()=>{privacy.awaitTrack(1);channel('pi.stall.await.v1').publish({get action(){throw new Error('sentinel-secret')}});pub.flag(1,'sentinel-secret');pub.start('sentinel-secret',1);privacy.awaitSnapshot();privacy.awaitUntrack()});
  assert(!fs.readFileSync(path.join(privacyDir,fs.readdirSync(privacyDir)[0]),'utf8').includes('sentinel-secret'));
  // Iterator façade preserves promise/value/error identity and receiver without
  // adding a settlement observer; actual consumer awaits perform the clearing.
  const value={done:false,value:{}}, promise=Promise.resolve(value);let seen,args;
  const originalIterator={next(...values){seen=this;args=values;return promise}};
  const source={ [Symbol.asyncIterator](){return originalIterator} };
  const wrapped=pub.iterator(source,1,'body.next','body.cleanup','inner');
  const iterator=wrapped.source[Symbol.asyncIterator]();assert.equal(iterator.next(42),promise);assert.equal(seen,originalIterator);assert.deepEqual(args,[42]);assert.equal(await promise,value);wrapped.step();wrapped.finish();
  // Exercise the real timer API while observing only the test logger's timer.
  let timer, cleared=false;const originalInterval=globalThis.setInterval,originalClear=globalThis.clearInterval;
  globalThis.setInterval=(fn,ms)=>{assert.equal(ms,1000);timer=originalInterval(fn,ms);return timer};
  globalThis.clearInterval=id=>{if(id===timer)cleared=true;return originalClear(id)};
  try{const timers=createDiagnostics(path.join(work,'timer'));timers.scope({request:500},()=>{timers.awaitTrack(1);assert.equal(timer.hasRef(),false);timers.awaitUntrack();assert(cleared)})}
  finally{globalThis.setInterval=originalInterval;globalThis.clearInterval=originalClear;if(timer)originalClear(timer)}
  // Concurrent sessions and deferred expired publisher handles never borrow an owner.
  const concurrentDir=path.join(work,'concurrent'),concurrent=createDiagnostics(concurrentDir);
  const concurrentScopes=[{request:701,session:11,turn:21},{request:702,session:12,turn:22}];
  for(const ctx of concurrentScopes)concurrent.scope(ctx,()=>{concurrent.awaitTrack(ctx.request);pub.start('callback',pub.capture())});
  assert.equal(pub.capture(),undefined);
  for(const ctx of concurrentScopes)concurrent.scope(ctx,()=>concurrent.awaitSnapshot());
  const concurrentRecords=fs.readdirSync(concurrentDir).flatMap(f=>fs.readFileSync(path.join(concurrentDir,f),'utf8').trim().split('\n').map(JSON.parse));
  for(const ctx of concurrentScopes){const s=concurrentRecords.find(r=>r.summary.request===ctx.request).summary;assert.equal(s.session,ctx.session);assert.equal(s.turn,ctx.turn);assert.equal(s.pending.length,1)}
  concurrent.scope(concurrentScopes[0],()=>concurrent.awaitUntrack());assert.equal(pub.start('body.next',701),undefined);
  concurrent.scope(concurrentScopes[1],()=>{concurrent.awaitSnapshot();concurrent.awaitUntrack()});
  assert.equal(channel('pi.stall.await.v1').hasSubscribers,false);
  return {loggerFile, checks:['SDK provider eligibility and user callback exclusion','two real one-second samples retain callback pending','rotation retains pending state','settlement clears pending slots','saturating million-transition counter with two lifecycle records','overflow remains sampled after tracked requests settle','128 request and 32 slot caps with overflow','16 KiB summary cap','idle subscription cleanup','disabled logger','sink failure isolation','throwing publisher/setup isolation','owned subscriber getter failure isolation','sentinel privacy','iterator promise/value/receiver/argument identity','actual Bun sampler unref and clearInterval on idle','concurrent session attribution and expired handle exclusion'], stagedFiles:manifest.targets.length};
}
