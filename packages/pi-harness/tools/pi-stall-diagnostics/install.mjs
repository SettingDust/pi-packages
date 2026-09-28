import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { inspect, inspectGoogle, stage, sha256, revision } from './stage.mjs';
import { smoke } from './smoke.mjs';
import { stageAwaits } from './awaits.mjs';

const names = ['chunk-OJP47DM6.js', 'chunk-FUXEF6JQ.js'];
const originals = ['81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020', 'b7d0697d0f4c7d3b54c6aee545d3b27c5981c27d0470e1c79876898f28f2c472'];
const patches = ['b1c6995246bb393df5fda23dc3a286f7d8f26814a09fc2aa140760ba78207d3c', '32b6ff866b6a64fc2613fa12474f7ada5ca1483a362d0be7680735bdaedc1200'];
const backupNames = ['original.js', 'google-original.js'];
const stageNames = ['patched.mjs', 'google-patched.mjs'];
const digest = file => sha256(fs.readFileSync(file));
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error('Invalid JSON recovery metadata'); }
}
export const classify = root => names.map((file, i) => {
  try {
    const hash = digest(path.join(root, 'dist', 'bundle', 'chunks', file));
    return { file, hash, state: hash === originals[i] ? 'original' : hash === patches[i] ? 'patched' : 'unknown' };
  } catch { return { file, hash: null, state: 'unknown' }; }
});

// Expanded admission uses the accepted T3 contract, never caller-selected hashes.
function awaitEvidence() {
  const e = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/awaits-offline.json', import.meta.url));
  if (e.status !== 'passed' || !e.t3Complete || e.awaitManifest.revision !== 'offline-7-awaits') throw new Error('Await evidence unavailable');
  for (const file of ['awaits.mjs', 'stage.mjs', 'logger.mjs']) {
    if (digest(new URL(file, import.meta.url)) !== e.kitHashes[file]) throw new Error('Await transformation drift');
  }
  return e;
}
export function classifyAwaits(root) {
  return awaitEvidence().awaitManifest.targets.map(file => {
    const name = path.basename(file.target);
    try {
      const hash = digest(path.join(root, 'dist/bundle/chunks', name));
      const matches = ['original', 'base', 'patched'].filter(state => hash === file[state + 'Hash']);
      return { file: name, hash, state: matches.join('/') || 'unknown' };
    } catch { return { file: name, hash: null, state: 'unknown' }; }
  });
}
export function disposableAwaits(source) {
  const e = awaitEvidence(), sourceRoot = fs.realpathSync(source);
  if (sourceRoot !== liveRoot()) throw new Error('Await read-source mapping drift');
  for (const [name, hash] of Object.entries(e.sourceHashes)) {
    if (digest(path.join(sourceRoot, 'dist/bundle/chunks', name)) !== hash) throw new Error('Await baseline drift');
  }
  const recovery = path.resolve('C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1');
  const work = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pi-stall-pair-'));
  const root = path.join(work, 'fixture'), directory = path.join(work, 'stage');
  fs.cpSync(sourceRoot, root, { recursive: true, dereference: true }); fs.mkdirSync(directory);
  for (const [i, name] of names.entries()) {
    const backup = path.join(recovery, backupNames[i]); regular(backup);
    if (digest(backup) !== originals[i]) throw new Error('Pristine recovery drift');
    fs.copyFileSync(backup, path.join(root, 'dist/bundle/chunks', name));
  }
  const manifest = stageAwaits(root, directory, e.sourceHashes);
  for (const file of manifest.targets) {
    const name = path.basename(file.target), expected = e.awaitManifest.targets.find(t => path.basename(t.target) === name);
    if (!expected || ['originalHash', 'baseHash', 'patchedHash'].some(k => file[k] !== expected[k]) || JSON.stringify(file.selectors) !== JSON.stringify(expected.selectors)) throw new Error('Await reproduction drift');
    file.baseline = path.join(directory, name + '.baseline');
    fs.writeFileSync(file.baseline, fs.readFileSync(path.join(sourceRoot, 'dist/bundle/chunks', name)), { flag: 'wx' });
    if (digest(file.baseline) !== file.baseHash) throw new Error('Baseline backup drift');
    fs.copyFileSync(file.baseline, file.target);
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(work, 'disposable.json'), JSON.stringify({ root, directory, source: sourceRoot }), { flag: 'wx' });
  return { work, root, directory, manifest };
}
export function applyAwaits(root, directory, action, options) {
  try {
    if (!options?.disposable || !['install', 'rollback', 'pristine'].includes(action)) throw new Error('Expanded operations require disposable verification');
    root = path.resolve(root); directory = path.resolve(directory); admission(root, directory);
  } catch (error) { error.states = classifyAwaits(root); throw error; }
  return operate(root, directory, action, options, false, true);
}

export function prepareAwaits(directory) {
  const root = liveRoot(); liveCompatibility(root);
  directory = fs.realpathSync(directory); liveAdmission(root, directory);
  if (directory === path.resolve('C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1') || fs.readdirSync(directory).length) throw new Error('New empty recovery directory required');
  const fixture = disposableAwaits(root), manifest = fixture.manifest;
  // Rebind only independently reproduced, canonical material. Never accept an edited manifest.
  for (const file of manifest.targets) {
    const name = path.basename(file.target);
    file.target = path.join(root, 'dist/bundle/chunks', name);
    regular(file.target);
    if (digest(file.target) !== file.baseHash) throw new Error('Baseline changed during preparation');
    for (const key of ['backup', 'baseline', 'staged']) {
      const destination = path.join(directory, path.basename(file[key]));
      fs.copyFileSync(file[key], destination, fs.constants.COPYFILE_EXCL); file[key] = destination;
    }
  }
  manifest.root = root;
  manifest.sourceGuards = manifest.sourceGuards.map(f => ({ ...f, target: path.join(root, 'dist/bundle/chunks', path.basename(f.target)) }));
  const mapped = inspect(root, manifest.targets[0].baseHash);
  if (mapped.entryHash !== manifest.entryHash || mapped.runtimeHash !== manifest.runtimeHash || root !== liveRoot()) throw new Error('Preparation mapping drift');
  for (const [name, hash] of Object.entries(awaitEvidence().sourceHashes)) {
    const file = path.join(root, 'dist/bundle/chunks', name); regular(file);
    if (digest(file) !== hash) throw new Error('Preparation source drift');
  }
  for (const file of manifest.targets) for (const [key, hashKey] of [['backup','originalHash'],['baseline','baseHash'],['staged','patchedHash']]) {
    regular(file[key]); if (digest(file[key]) !== file[hashKey]) throw new Error('Preparation recovery drift');
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}
function awaitCompatibility(root) {
  liveCompatibility(root);
  const e = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/await-install-offline.json', import.meta.url));
  if (e.status !== 'passed' || !e.t4Complete || e.runtime.bun !== process.versions.bun) throw new Error('Expanded offline acceptance incomplete');
  for (const file of ['install.mjs', 'activate.mjs', 'check-await-install.mjs', 'check-await-mixed.mjs']) {
    if (digest(new URL(file, import.meta.url)) !== e.kitHashes?.[file]) throw new Error('Expanded acceptance drift');
  }
}
export function applyAwaitsLive(directory, action) {
  const root = liveRoot();
  try {
    if (!['install', 'rollback', 'pristine'].includes(action)) throw new Error('Invalid expanded action');
    directory = path.resolve(directory); liveAdmission(root, directory); awaitCompatibility(root);
  } catch (error) { error.states = classifyAwaits(root); throw error; }
  return operate(root, directory, action, { smoke }, true, true);
}

// Metadata only: conservatively refuse every other JS/Pi runtime, even if its
// executable path is unavailable. No command lines or environment are collected.
export function processMetadata() {
  if (process.platform !== 'win32') throw new Error('Process inspection unavailable on this host');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    '$ErrorActionPreference="Stop"; @(Get-CimInstance Win32_Process | Select-Object ProcessId,Name,ExecutablePath) | ConvertTo-Json -Compress'],
  { encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0 || !result.stdout) throw new Error('Process inspection inconclusive');
  let processes;
  try { processes = JSON.parse(result.stdout); } catch { throw new Error('Process inspection inconclusive'); }
  if (!Array.isArray(processes) || !processes.length) throw new Error('Process inspection inconclusive');
  return processes;
}
export function blockers(processes, root, self = process.pid) {
  const needle = root.replaceAll('\\', '/').toLowerCase();
  if (!Array.isArray(processes) || !processes.some(p => p.ProcessId === self)) throw new Error('Process inspection inconclusive');
  return processes.filter(proc => {
    if (!Number.isInteger(proc.ProcessId) || typeof proc.Name !== 'string' || !proc.Name) throw new Error('Process inspection inconclusive');
    if (proc.ProcessId === self || proc.ProcessId <= 4) return false;
    const executable = (proc.ExecutablePath || '').replaceAll('\\', '/').toLowerCase();
    return /^(?:node|nodejs|bun|pi)(?:\.exe)?$/i.test(proc.Name) || executable.includes(needle);
  }).map(({ ProcessId, Name, ExecutablePath }) => ({ pid: ProcessId, name: Name, executable: ExecutablePath || null }));
}
export function inactive(root) {
  if (blockers(processMetadata(), root).length) throw new Error('Target may be in use; other JS/Pi runtimes must exit normally');
  return true;
}

export const liveSource = 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent';
const pinnedRoot = path.resolve('D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent');
export function liveRoot() {
  const root = fs.realpathSync(liveSource);
  if (root !== pinnedRoot) throw new Error('Live target mapping drift');
  return root;
}
function liveAdmission(root, directory) {
  if (root !== liveRoot() || directory !== fs.realpathSync(directory) ||
      directory === root || directory.startsWith(root + path.sep) || root.startsWith(directory + path.sep)) throw new Error('Invalid live paths');
}
export function verifiedLauncher(launcher) {
  const suffix = ' "%~dp0node_modules\\@earendil-works\\pi-coding-agent\\dist\\bundle\\cli.js" %*\n';
  return ['bun', 'bun --inspect'].some(command => launcher.replaceAll('\r\n', '\n') === '@echo off\n' + command + suffix);
}
// Fixed, source-verified compatibility admission. Occupancy is informational:
// cached main modules stay cached, and either SDK revision has the same exports.
export function liveCompatibility(root) {
  if (root !== liveRoot() || process.platform !== 'win32' || process.versions.bun !== '1.4.0' ||
      fs.realpathSync('D:/Applications/Scoop/apps/bun/current/bun.exe') !== fs.realpathSync(process.execPath)) throw new Error('Use the verified Bun 1.4.0 runtime for live operations');
  const launcher = fs.readFileSync('D:/Applications/Scoop/apps/pi-coding-agent-bun/current/pi.cmd', 'utf8');
  if (!verifiedLauncher(launcher)) throw new Error('Pi launcher mapping drift');
  const evidence = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/live-runtime-activation.json', import.meta.url));
  const google = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/google-bun-activation.json', import.meta.url));
  if (evidence.status !== 'passed' || evidence.runtime.bun !== process.versions.bun || google.status !== 'passed' || google.runtime.bun !== process.versions.bun) throw new Error('Live runtime compatibility evidence missing');
  for (const file of ['stage.mjs', 'logger.mjs', 'smoke.mjs', 'smoke-probe.mjs', 'check-live-runtime.mjs']) {
    if (digest(new URL(file, import.meta.url)) !== evidence.sourceHashes?.[file]) throw new Error('Live runtime verification drift');
  }
  for (const file of ['stage.mjs', 'logger.mjs', 'check-google.mjs']) {
    if (digest(new URL(file, import.meta.url)) !== google.sourceHashes?.[file]) throw new Error('Google runtime verification drift');
  }
  return true;
}
// No caller-supplied inactivity, smoke, fault or disposable options on this path.
export function applyLive(directory, action) {
  const root = liveRoot();
  try {
    if (!['install', 'rollback'].includes(action)) throw new Error('Invalid action');
    directory = path.resolve(directory);
    liveAdmission(root, directory);
    liveCompatibility(root);
  } catch (error) { error.states = classify(root); throw error; }
  return operate(root, directory, action, { smoke }, true);
}

// Only this factory admits a disposable copy to apply(). applyLive() has separate admission.
export function disposable(source) {
  const before = inspect(source); inspectGoogle(before);
  const work = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'pi-stall-pair-'));
  const root = path.join(work, 'fixture'), directory = path.join(work, 'stage');
  fs.cpSync(before.root, root, { recursive: true, dereference: true });
  fs.mkdirSync(directory);
  const manifest = stage(root, directory);
  fs.writeFileSync(path.join(work, 'disposable.json'), JSON.stringify({ root, directory, source: before.root }), { flag: 'wx' });
  return { work, root, directory, manifest };
}

function regular(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.nlink !== 1 || fs.realpathSync(file) !== file) throw new Error('Noncanonical or linked file');
}
function admission(root, directory) {
  const work = path.dirname(root), temp = fs.realpathSync(os.tmpdir());
  if (path.dirname(work) !== temp || !/^pi-stall-pair-[\w-]+$/.test(path.basename(work)) ||
      root !== path.join(work, 'fixture') || directory !== path.join(work, 'stage') ||
      fs.realpathSync(root) !== root || fs.realpathSync(directory) !== directory) throw new Error('Disposable isolation required');
  const marker = readJson(path.join(work, 'disposable.json'));
  if (marker.root !== root || marker.directory !== directory || marker.source === root || root.startsWith(marker.source + path.sep)) throw new Error('Disposable isolation required');
}

// Windows kernel mutex, held by a helper waiting for our stdin EOF. Parent exit
// releases ownership without PID-file stealing races. No process is terminated.
async function ownership(root) {
  if (process.platform !== 'win32') throw new Error('Replacement/ownership unsupported on this host');
  const name = 'Global\\PiStallPair-' + sha256(root.toLowerCase());
  const script = `$m=[System.Threading.Mutex]::new($false,'${name}');$held=$false;try{try{$held=$m.WaitOne(0)}catch [System.Threading.AbandonedMutexException]{$held=$true};if(!$held){exit 23};[Console]::WriteLine('owned');[Console]::Out.Flush();[Console]::ReadLine() | Out-Null}finally{if($held){$m.ReleaseMutex()};$m.Dispose()}`;
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let alive = true;
  const exit = new Promise(resolve => { child.once('exit', code => { alive = false; resolve(code); }); child.once('error', () => { alive = false; resolve(-1); }); });
  child.stderr.resume();
  child.stdin.on('error', () => {});
  await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', bytes => { output += bytes; if (output.includes('owned\n') || output.includes('owned\r\n')) resolve(); });
    exit.then(() => reject(new Error('Concurrent operation or ownership unavailable')));
  });
  return { check() { if (!alive) throw new Error('Ownership lost'); }, async release() { child.stdin.end('\n'); await exit; } };
}

export function apply(root, directory, action, options) {
  // Preserve the legacy caller's fail-closed refusal; live callers use applyLive.
  try {
    if (!options?.disposable) throw new Error('Paired installation is disabled outside disposable verification');
    if (!['install', 'rollback'].includes(action)) throw new Error('Invalid action');
    root = path.resolve(root); directory = path.resolve(directory);
    admission(root, directory);
  } catch (error) { error.states = classify(root); throw error; }
  return operate(root, directory, action, options);
}

async function operate(root, directory, action, options, live = false, expanded = false) {
  const contract = expanded ? awaitEvidence().awaitManifest : null;
  const evidenceHash = expanded ? digest(new URL('../../docs/works/pi-stall-diagnostics/evidence/awaits-offline.json', import.meta.url)) : null;
  const targetNames = expanded ? contract.targets.map(t => path.basename(t.target)) : names;
  const targets = targetNames.map(name => path.join(root, 'dist', 'bundle', 'chunks', name));
  const states = () => expanded ? classifyAwaits(root) : classify(root);
  let lock;
  try { lock = await ownership(root); } catch (error) { error.states = states(); throw error; }
  let manifest, changed = false, liveInstallSmoke = false;
  const fault = (point, index) => options.fault?.(point, index);
  function guard() {
    lock.check(); (live ? liveAdmission : admission)(root, directory);
    if (live) (expanded ? awaitCompatibility : liveCompatibility)(root);
    else if (!expanded && (options.inactive ?? inactive)(root) !== true) throw new Error('Inactivity not established');
    regular(path.join(directory, 'manifest.json'));
    const current = readJson(path.join(directory, 'manifest.json'));
    if (manifest && JSON.stringify(current) !== JSON.stringify(manifest)) throw new Error('Manifest drift');
    manifest = current;
    if (expanded) return guardAwaits();
    if (manifest.revision !== revision || manifest.activationAllowed !== false || manifest.version !== '0.87.1' || manifest.root !== root || !Array.isArray(manifest.targets) || manifest.targets.length !== 2) throw new Error('Invalid pair manifest');
    const verified = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/reconciliation-offline-6.json', import.meta.url));
    if (manifest.target !== targets[0] || manifest.originalHash !== originals[0] || manifest.patchedHash !== patches[0] ||
        JSON.stringify(manifest.boundaries) !== JSON.stringify(verified.targets[0].boundaries)) throw new Error('Main alias drift');
    for (let i = 0; i < 2; i++) {
      const file = manifest.targets[i];
      if (file.target !== targets[i] || file.originalHash !== originals[i] || file.patchedHash !== patches[i] ||
          file.backup !== path.join(directory, backupNames[i]) || file.staged !== path.join(directory, stageNames[i]) ||
          JSON.stringify(file.boundaries) !== JSON.stringify(verified.targets[i].boundaries)) throw new Error('Invalid pair paths/hashes/selectors');
      for (const f of [file.target, file.backup, file.staged]) regular(f);
      if (digest(file.backup) !== originals[i] || digest(file.staged) !== patches[i]) throw new Error('Stage/backup drift');
    }
    const state = states();
    if (state.some(file => file.state === 'unknown')) throw new Error('Unknown installed bytes');
    for (const relative of ['package.json', 'dist/bundle/cli.js', 'dist/bundle/cli-runtime.js']) regular(path.join(root, relative));
    const mapped = inspect(root, state[0].hash);
    if (mapped.target !== targets[0] || mapped.entryHash !== 'e79626f2dd6f94aa45d30f3fa63cd84319a6eefcd150b353cfaf274366926774' ||
        mapped.runtimeHash !== '9ca136a7caa977d936aa789d7448a3dfb17851677ff5ac8c0dbcf23c31a02142' ||
        manifest.entryHash !== mapped.entryHash || manifest.runtimeHash !== mapped.runtimeHash) throw new Error('Installation mapping drift');
    const evidence = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/google-http-0.87.1.json', import.meta.url));
    if (JSON.stringify(manifest.sourceGuards) !== JSON.stringify(evidence.files)) throw new Error('Source guard drift');
    for (const file of evidence.files) {
      const target = path.join(root, file.file);
      regular(target);
      if (!targets.includes(target) && digest(target) !== file.sha256) throw new Error('Adapter mapping drift');
    }
    return state;
  }
  function guardAwaits() {
    if (digest(new URL('../../docs/works/pi-stall-diagnostics/evidence/awaits-offline.json', import.meta.url)) !== evidenceHash) throw new Error('Await authority evidence drift');
    if (manifest.revision !== 'offline-7-awaits' || manifest.activationAllowed !== false || manifest.version !== '0.87.1' || manifest.root !== root || manifest.targets?.length !== 5 || manifest.entryHash !== contract.entryHash || manifest.runtimeHash !== contract.runtimeHash) throw new Error('Invalid await manifest');
    for (let i = 0; i < targets.length; i++) {
      const file = manifest.targets[i], expected = contract.targets[i], name = targetNames[i];
      if (file.target !== targets[i] || ['originalHash', 'baseHash', 'patchedHash'].some(k => file[k] !== expected[k]) || JSON.stringify(file.selectors) !== JSON.stringify(expected.selectors) || file.backup !== path.join(directory, name + '.original') || file.baseline !== path.join(directory, name + '.baseline') || file.staged !== path.join(directory, name + '.mjs')) throw new Error('Invalid await paths/hashes/selectors');
      for (const f of [file.target, file.backup, file.baseline, file.staged]) regular(f);
      if (digest(file.backup) !== expected.originalHash || digest(file.baseline) !== expected.baseHash || digest(file.staged) !== expected.patchedHash) throw new Error('Await recovery material drift');
    }
    const state = states();
    if (state.some(f => f.state === 'unknown')) throw new Error('Unknown installed bytes');
    for (const relative of ['package.json', 'dist/bundle/cli.js', 'dist/bundle/cli-runtime.js']) regular(path.join(root, relative));
    const mapped = inspect(root, state[0].hash);
    if (mapped.target !== targets[0] || mapped.entryHash !== contract.entryHash || mapped.runtimeHash !== contract.runtimeHash) throw new Error('Installation mapping drift');
    const guards = contract.sourceGuards.map(f => ({ target: path.join(root, 'dist/bundle/chunks', path.basename(f.target)), sha256: f.sha256 }));
    if (JSON.stringify(manifest.sourceGuards) !== JSON.stringify(guards)) throw new Error('Read-only guard drift');
    const google = readJson(new URL('../../docs/works/pi-stall-diagnostics/evidence/google-http-0.87.1.json', import.meta.url));
    for (const f of [...guards, ...google.files.map(f => ({ target: path.join(root, f.file), sha256: f.sha256 }))]) {
      regular(f.target);
      if (!targets.includes(f.target) && digest(f.target) !== f.sha256) throw new Error('Read-only mapping drift');
    }
    return state;
  }
  const hashFor = (i, desired) => expanded ? contract.targets[i][desired + 'Hash'] : desired === 'original' ? originals[i] : patches[i];
  const inSet = (state, desired) => state.every((f, i) => f.hash === hashFor(i, desired));
  function journal(phase, index) {
    // Append-only intent/progress is diagnostic; target hashes alone drive recovery.
    const file = path.join(directory, 'recovery.jsonl');
    if (fs.existsSync(file)) regular(file);
    const fd = fs.openSync(file, 'a');
    try { fs.writeSync(fd, JSON.stringify({ action, phase, index, states: states() }) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  }
  function replace(i, desired, recovering = false) {
    let state = guard();
    if (state[i].hash === hashFor(i, desired)) return;
    const target = targets[i], temporary = target + '.stall-' + process.pid + '-' + Date.now() + '.tmp';
    const bytes = fs.readFileSync(manifest.targets[i][desired === 'original' ? 'backup' : desired === 'base' ? 'baseline' : 'staged']);
    const expected = hashFor(i, desired);
    let created = false;
    try {
      const fd = fs.openSync(temporary, 'wx', fs.statSync(target).mode);
      created = true;
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      regular(temporary);
      if (digest(temporary) !== expected) throw new Error('Temporary copy drift');
      journal(recovering ? 'recovery-intent' : 'intent', i);
      fault(recovering ? 'recovery-before' : 'before', i);
      const fresh = guard();
      if (JSON.stringify(fresh) !== JSON.stringify(state)) throw new Error('Installed bytes changed during operation');
      regular(temporary);
      if (digest(temporary) !== expected) throw new Error('Temporary copy drift');
      // Same-directory rename replaces one file. The pair is never atomic.
      fs.renameSync(temporary, target); changed = true;
      fault(recovering ? 'recovery-after' : 'after', i);
      if (digest(target) !== expected) throw new Error('Replacement verification failed');
      journal(recovering ? 'recovery-progress' : 'progress', i);
    } finally { if (created && fs.existsSync(temporary)) fs.rmSync(temporary); }
  }
  function restore() { guard(); for (let i = 0; i < targets.length; i++) replace(i, expanded ? 'base' : 'original', true); guard(); }
  try {
    const initial = guard();
    fault('owned');
    if (expanded ? !['original', 'base', 'patched'].some(set => inSet(initial, set)) : initial[0].state !== initial[1].state) {
      restore(); journal('mixed-restored');
      return { state: expanded ? 'recovered-baseline-retry-install' : 'recovered-originals-retry-install', activationAllowed: false, states: states() };
    }
    const desired = action === 'install' ? 'patched' : expanded && action === 'rollback' ? 'base' : 'original';
    const consistent = () => {
      const current = guard();
      if (!inSet(current, desired)) throw new Error('Pair changed during operation');
      return current;
    };
    if (inSet(initial, desired)) {
      if (live) { liveInstallSmoke = action === 'install'; await options.smoke(root); }
      return { state: 'already-' + action, activationAllowed: live && desired === 'patched', states: consistent() };
    }
    if (action === 'install' && typeof options.smoke !== 'function') throw new Error('Disposable smoke required');
    for (let i = 0; i < targets.length; i++) replace(i, desired);
    consistent();
    if (action === 'install' || live) { fault('smoke'); await options.smoke(root); }
    const final = consistent();
    journal('complete');
    return { state: action, activationAllowed: live && desired === 'patched', states: final };
  } catch (error) {
    if (changed || liveInstallSmoke) {
      try { restore(); journal('failure-restored'); error.restored = true; }
      catch (recovery) { error.recoveryError = recovery.message; }
    }
    error.states = states(); throw error;
  } finally { await lock.release(); }
}
