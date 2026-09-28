import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { disposableAwaits, applyAwaits, apply, disposable, liveRoot } from './install.mjs';
import { sha256, inspect, instrument } from './stage.mjs';
import { smoke } from './smoke.mjs';
const digest = f => sha256(fs.readFileSync(f));
const args = process.argv.slice(2);
if (args[0] === '--interrupt') {
  const [, root, directory, action, point, index] = args;
  await applyAwaits(root, directory, action, { disposable: true, smoke() {}, fault(p, i) { if (p === point && i === +index) process.exit(73); } });
  process.exit(74);
}
const [source, output] = args;
assert(source && output, 'Usage: bun check-await-install.mjs SOURCE EVIDENCE_JSON');
assert.equal(process.versions.bun, '1.4.0'); assert.equal(process.platform, 'win32');
const evidencePath = path.resolve(output);
const t3Path = new URL('../../docs/works/pi-stall-diagnostics/evidence/awaits-offline.json', import.meta.url);
const t3 = JSON.parse(fs.readFileSync(t3Path));
const recovery = 'C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1';
const tree = dir => Object.fromEntries(fs.readdirSync(dir, { recursive: true }).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort().map(f => [f, digest(path.join(dir, f))]));
const readSource = () => Object.fromEntries(Object.keys(t3.sourceHashes).map(f => [f, digest(path.join(source, 'dist/bundle/chunks', f))]));
const incident = () => {
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-Process -Id 265264 -ErrorAction Stop | ForEach-Object { $_.StartTime.ToUniversalTime().ToString("o") }'],{encoding:'utf8',timeout:15000});
  return {pid:265264,available:result.status===0,startTime:result.status===0?result.stdout.trim():null};
};
const incidentBefore=incident();
const sourceBefore = readSource(), recoveryBefore = tree(recovery), mappingBefore = inspect(source, sourceBefore['chunk-OJP47DM6.js']);
assert.deepEqual(sourceBefore, t3.sourceHashes); assert.equal(fs.realpathSync(source), liveRoot());
const evidence = { status: 'running', t4Complete: false, activationAllowed: false, command: ['bun', fileURLToPath(import.meta.url), source, evidencePath], runtime: { bun: process.versions.bun }, checks: [], t3EvidenceHash: digest(t3Path), reusedKitHashes: {}, missing: ['expanded activation command routing', 'full compatibility and recovery acceptance'] };
const save = () => fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const record = (name, details = {}) => { evidence.checks.push({ name, ...details }); save(); console.log(name); };
save();
try {
  for (const [file, hash] of Object.entries(t3.kitHashes)) {
    if (file === 'install.mjs') continue;
    assert.equal(digest(new URL(file, import.meta.url)), hash); evidence.reusedKitHashes[file] = hash;
  }
  record('Unchanged T3 diagnostic kit evidence reused by hash');
  const fixture = disposableAwaits(source), { root, directory, work, manifest } = fixture;
  evidence.fixture = work; evidence.manifest = manifest; save();
  fs.symlinkSync(path.dirname(path.dirname(fs.realpathSync(source))), path.join(work, 'node_modules'), 'junction');
  const files = manifest.targets, manifestPath = path.join(directory, 'manifest.json'), manifestBytes = fs.readFileSync(manifestPath);
  const hashes = () => files.map(f => digest(f.target));
  const expected = set => files.map(f => f[set + 'Hash']);
  const bytes = files.map(f => ({ original: fs.readFileSync(f.backup), base: fs.readFileSync(f.baseline), patched: fs.readFileSync(f.staged) }));
  const reset = (set = 'base') => files.forEach((f, i) => fs.writeFileSync(f.target, bytes[i][Array.isArray(set) ? set[i] : set]));
  const check = set => assert.deepEqual(hashes(), expected(set));
  const run = (action, extra = {}) => applyAwaits(root, directory, action, { disposable: true, smoke() { check('patched'); }, ...extra });
  assert.equal(sha256(instrument(bytes[0].original.toString(), fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8')).source), files[0].baseHash);
  record('Exact original-to-offline-6 main reproduction; five verified pristine/baseline/new materials');
  for (const f of files) {
    const before = fs.readFileSync(f.backup, 'utf8'), after = fs.readFileSync(f.staged, 'utf8');
    assert.deepEqual(after.match(/export\{[^}]+\}/g), before.match(/export\{[^}]+\}/g));
    const imports = text => [...text.matchAll(/(?:from|import\()["'](\.[^"']+)["']/g)].map(m => m[1]);
    assert.deepEqual(imports(after), imports(before));
  }
  record('Five import/export contracts unchanged');
  const mtime = () => files.map(f => fs.statSync(f.target, { bigint: true }).mtimeNs.toString());
  const googleTime = mtime()[4]; await run('install'); check('patched'); assert.equal(mtime()[4], googleTime);
  let times = mtime(); await run('install'); assert.deepEqual(mtime(), times);
  await run('rollback'); check('base'); times = mtime(); await run('rollback'); assert.deepEqual(mtime(), times);
  await run('pristine'); check('original'); times = mtime(); await run('pristine'); assert.deepEqual(mtime(), times);
  record('Install/baseline rollback/pristine restoration and repeat no-rewrite; unchanged Google skipped');
  reset(); await assert.rejects(apply(root, directory, 'install', { disposable: true, inactive: () => true }), /Invalid pair manifest/); check('base');
  record('Pair-only admission still refuses expanded revision');
  for (const action of ['install', 'rollback']) for (const point of ['before', 'after']) for (let i = 0; i < 4; i++) {
    reset(action === 'install' ? 'base' : 'patched');
    await assert.rejects(run(action, { fault(p, n) { if (p === point && n === i) throw new Error('fixture fault'); } }), /fixture fault/);
    if (point === 'before' && i === 0) check(action === 'install' ? 'base' : 'patched'); else check('base');
    record('Thrown boundary fault restores baseline', { action, point, index: i });
  }
  for (const action of ['install', 'rollback']) for (const point of ['before', 'after']) for (let i = 0; i < 4; i++) {
    reset(action === 'install' ? 'base' : 'patched');
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--interrupt', root, directory, action, point, String(i)], { encoding: 'utf8', timeout: 20000 });
    assert.equal(child.status, 73, child.stderr);
    fs.writeFileSync(path.join(directory, 'recovery.jsonl'), '{truncated');
    await run('rollback'); check('base'); await run('rollback'); check('base');
    record('Voluntary worker exit and truncated journal restart restores baseline', { action, point, index: i });
  }
  for (const point of ['recovery-before', 'recovery-after']) for (let i = 0; i < 4; i++) {
    reset(); fs.writeFileSync(files[i].target, bytes[i].patched);
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--interrupt', root, directory, 'install', point, String(i)], { encoding: 'utf8', timeout: 20000 });
    assert.equal(child.status, 73, child.stderr);
    await run('rollback'); check('base'); record('Interrupted mixed restoration repeatable', { point, index: i });
  }
  reset(); await assert.rejects(run('install', { smoke() { throw new Error('smoke fault'); } }), /smoke fault/); check('base'); record('Smoke failure restores baseline');
  async function refused(name, action = 'install', extra = {}) {
    const before = hashes();
    await assert.rejects(run(action, extra), error => { assert.equal(error.states.length, 5); return true; });
    assert.deepEqual(hashes(), before); record(name);
  }
  for (let i = 0; i < 5; i++) {
    reset(); fs.appendFileSync(files[i].target, '//unknown'); await refused('Unknown target preserved: ' + i);
    reset();
    for (const material of ['backup', 'baseline', 'staged']) for (const defect of ['missing', 'corrupt']) {
      const f = files[i][material], original = fs.readFileSync(f);
      if (defect === 'missing') fs.unlinkSync(f); else fs.appendFileSync(f, '//drift');
      await refused(`${material} ${defect} refuses writes: ${i}`); fs.writeFileSync(f, original);
    }
  }
  for (const mutate of [m => m.targets.push(m.targets[0]), m => m.targets[0].target = files[1].target, m => m.targets[0].baseline = path.join(work,'escape'), m => m.targets[0].selectors = [], m => m.sourceGuards = [], m => m.root = source]) {
    const m = JSON.parse(manifestBytes); mutate(m); fs.writeFileSync(manifestPath, JSON.stringify(m));
    await refused('Malformed/path/selector manifest refused'); fs.writeFileSync(manifestPath, manifestBytes);
  }
  for (const f of [path.join(root,'dist/bundle/cli-runtime.js'),path.join(root,'dist/bundle/chunks/chunk-A3JYRWB6.js'), path.join(root,'dist/bundle/chunks/google-vertex-O4YJEQUW.js')]) {
    const original = fs.readFileSync(f); fs.appendFileSync(f,'//drift'); await refused('Mapping/read-only drift refused: '+path.basename(f)); fs.writeFileSync(f,original);
  }
  for (const key of ['target','backup','baseline','staged']) {
    const link = path.join(work,'hardlink'), f=files[0][key]; fs.linkSync(f,link); await refused('Linked '+key+' refused'); fs.unlinkSync(link);
  }
  for (const key of ['target','backup','baseline','staged']) {
    reset(); const f=files[3][key], original=fs.readFileSync(f);
    await assert.rejects(run('install',{fault(point,i){if(point==='after'&&i===0)fs.appendFileSync(f,'//between');}}), error=>{assert.equal(error.states.length,5);assert(error.recoveryError);return true;});
    assert.equal(digest(f),sha256(Buffer.concat([original,Buffer.from('//between')]))); fs.writeFileSync(f,original); reset();
    record('Between-write '+key+' drift stops recovery and reports all five residuals');
  }
  reset(); const fd=fs.openSync(files[0].target,'r');
  try { await refused('Windows open-reader refusal preserves bytes'); } finally { fs.closeSync(fd); }
  let entered, release; const held=new Promise(r=>entered=r), gate=new Promise(r=>release=r);
  const first=run('install',{async smoke(){entered();await gate;}}); await held;
  try { await refused('Concurrent ownership refused','rollback'); } finally {release();await first;}
  record('Windows serialized ownership');
  for (const set of ['base','patched','original']) {
    reset(set); const result=smoke(root); record('Consistent '+set+' isolated CLI/Google smoke',result);
  }
  const home=path.join(work,'home');fs.mkdirSync(home);
  const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:work,TMP:work,HOME:home,USERPROFILE:home,APPDATA:home,LOCALAPPDATA:home,PI_CODING_AGENT_DIR:path.join(home,'agent'),BUN_INSTALL_CACHE_DIR:path.join(work,'bun-cache'),BUN_RUNTIME_TRANSPILER_CACHE_PATH:path.join(work,'bun-transpiler')};
  for(let mask=0;mask<16;mask++)for(const mode of ['disabled','enabled']){
    const sets=files.map((_,i)=>i<4&&(mask&(1<<i))?'patched':'base');reset(sets);
    const resultFile=path.join(work,`mixed-${mask}-${mode}.json`);
    const child=spawnSync(process.execPath,[fileURLToPath(new URL('./check-await-mixed.mjs',import.meta.url)),root,directory,resultFile,mode,sets[0]],{cwd:home,env,encoding:'utf8',timeout:20000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(fs.readdirSync(home),[]);
    const result=JSON.parse(fs.readFileSync(resultFile));record('Bun cached-main/lazy-import fake OpenAI/forwarding combination',{mask,sets,mode,result});
  }
  reset('original');const pair=disposable(root);
  const pairRun=action=>apply(pair.root,pair.directory,action,{disposable:true,inactive:()=>true,smoke(){}});
  await pairRun('install');await pairRun('install');await pairRun('rollback');await pairRun('rollback');
  for(const f of pair.manifest.targets)assert.equal(digest(f.target),f.originalHash);
  record('Offline-6 install/repeat/rollback/repeat regression');
  for (let mask=1;mask<15;mask++) {
    reset(files.map((_,i)=>i<4&&(mask&(1<<i))?'patched':'base'));
    fs.writeFileSync(path.join(directory,'recovery.jsonl'),JSON.stringify({phase:'complete',states:expected('patched')})+'\n');
    const result=await run('install',{smoke(){assert.fail('Mixed set must recover without smoke');}});
    assert.equal(result.state,'recovered-baseline-retry-install');check('base');
    await run('install');check('patched');record('Known mixture and stale-success journal recover before separate installation',{mask});
  }
  for(const kind of ['selector','mapping','readonly','journal-link']) {
    reset();const file=kind==='selector'?manifestPath:kind==='mapping'?path.join(root,'dist/bundle/cli-runtime.js'):kind==='readonly'?manifest.sourceGuards[0].target:path.join(directory,'recovery.jsonl');
    if(!fs.existsSync(file))fs.writeFileSync(file,'');const original=fs.readFileSync(file),link=path.join(work,'journal-link');
    await assert.rejects(run('install',{fault(point,i){if(point==='after'&&i===0){if(kind==='journal-link')fs.linkSync(file,link);else fs.appendFileSync(file,'//between');}}}),error=>{assert.equal(error.states.length,5);assert(error.recoveryError);return true;});
    if(kind==='journal-link')fs.unlinkSync(link);fs.writeFileSync(file,original);reset();record('Between-write '+kind+' drift refuses unsafe recovery');
  }
  for(const set of ['base','patched','original'])for(const mode of ['disabled','enabled']) {
    reset(set);const resultFile=path.join(work,`consistent-${set}-${mode}.json`);
    const child=spawnSync(process.execPath,[fileURLToPath(new URL('./check-await-mixed.mjs',import.meta.url)),root,directory,resultFile,mode,set,'consistent'],{cwd:home,env,encoding:'utf8',timeout:20000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(fs.readdirSync(home),[]);check(set);
    record('Consistent '+set+' provider-free OpenAI/forwarding smoke',{mode,result:JSON.parse(fs.readFileSync(resultFile))});
  }
  reset(); check('base');
  evidence.status = 'passed'; evidence.t4Complete=true; evidence.missing=[];
  evidence.activationRequirements=['Separately selected activation; no live operation executed by acceptance','Fresh canonical source/version/runtime/import and all-five material/hash guards','New recovery directory preserving pristine and baseline bytes','Bun 1.4.0 compatible runtime and hash-matching offline acceptance','Consistent-set isolated provider-free smoke after real installation'];
  evidence.limitations=['Voluntary worker exit tests are not power-loss durability proof','The five replacements are serialized, not atomic','Mixed revisions provide partial diagnostic coverage; existing incident processes gain no claimed probes','Live prepare/install/rollback dispatch remains unexecuted; only disposable replacement was tested'];
} catch (error) {
  evidence.status = 'failed'; evidence.failure = { name: error.name, message: error.message }; throw error;
} finally {
  evidence.readSourceUnchanged = JSON.stringify(readSource()) === JSON.stringify(sourceBefore);
  evidence.recoveryUnchanged = JSON.stringify(tree(recovery)) === JSON.stringify(recoveryBefore);
  const mapped = inspect(source, sourceBefore['chunk-OJP47DM6.js']);
  evidence.mappingUnchanged = liveRoot() === fs.realpathSync(source) && mapped.entryHash === mappingBefore.entryHash && mapped.runtimeHash === mappingBefore.runtimeHash;
  evidence.kitHashes = Object.fromEntries(['install.mjs', 'activate.mjs', 'check-await-install.mjs', 'check-await-mixed.mjs'].map(f => [f, digest(new URL(f, import.meta.url))]));
  evidence.incidentProcess = {before:incidentBefore,after:incident(),limitation:'Read-only identity observation. An absent PID cannot be claimed preserved. No process termination, debugger attachment, inspector change or session operation is performed.'};
  if(!evidence.readSourceUnchanged || !evidence.recoveryUnchanged || !evidence.mappingUnchanged){evidence.status='failed';evidence.t4Complete=false;}
  save(); assert(evidence.readSourceUnchanged && evidence.recoveryUnchanged && evidence.mappingUnchanged);
}
