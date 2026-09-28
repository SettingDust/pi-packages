import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { apply, disposable } from './install.mjs';
import { inspect, inspectGoogle, sha256 } from './stage.mjs';

const args = process.argv.slice(2);
const idle = () => true; // Controlled disposable fixture only; not host inactivity evidence.
if (args[0] === '--interrupt') {
  const [, root, directory, action, point, index] = args;
  await apply(root, directory, action, { disposable: true, inactive: idle, smoke() {},
    fault(p, i) { if (p === point && i === Number(index)) process.exit(73); } });
  throw new Error('Interruption point not reached');
} else {
  const [source, evidenceFile] = args;
  assert.ok(source && evidenceFile, 'Usage: node check-pair.mjs READ_SOURCE EVIDENCE_JSON');
  const evidence = { status: 'running', activationAllowed: false, t1Complete: false,
    command: ['node', 'packages/pi-harness/tools/pi-stall-diagnostics/check-pair.mjs', source, evidenceFile],
    node: process.version, platform: process.platform, checks: [],
    limitations: ['Disposable inactivity is a controlled fixture assertion, not real-target process proof.',
      'Per-file Windows same-directory rename and process interruption tested; no atomic-pair or power-loss durability claim.',
      'No providers, existing sessions, installed writes or process termination. T2 remains excluded.'] };
  const persist = () => {
    fs.mkdirSync(path.dirname(path.resolve(evidenceFile)), { recursive: true });
    fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
  };
  const digest = file => sha256(fs.readFileSync(file));
  const record = (name, result = {}) => { evidence.checks.push({ name, ...result }); persist(); console.log(name); };
  persist();
  try {
    const before = inspect(source), google = inspectGoogle(before);
    const fixture = disposable(source), { root, directory, work, manifest } = fixture;
    evidence.manifest = manifest; evidence.disposableDirectory = work; persist();
    const files = manifest.targets;
    const manifestPath = path.join(directory, 'manifest.json');
    const manifestBytes = fs.readFileSync(manifestPath);
    const originals = files.map(f => fs.readFileSync(f.backup));
    const patches = files.map(f => fs.readFileSync(f.staged));
    const hashes = () => files.map(f => digest(f.target));
    const originalHashes = files.map(f => f.originalHash), patchedHashes = files.map(f => f.patchedHash);
    const reset = (states = ['original', 'original']) => {
      files.forEach((f, i) => {
        fs.writeFileSync(f.backup, originals[i]); fs.writeFileSync(f.staged, patches[i]);
        fs.writeFileSync(f.target, states[i] === 'patched' ? patches[i] : originals[i]);
      });
      fs.writeFileSync(manifestPath, manifestBytes);
    };
    const restored = () => assert.deepEqual(hashes(), originalHashes);
    const opts = { disposable: true, inactive: idle, smoke() { assert.deepEqual(hashes(), patchedHashes); } };
    const run = (action, extra = {}) => apply(root, directory, action, { ...opts, ...extra });
    async function refused(name, extra, action = 'install') {
      const beforeHashes = hashes();
      await assert.rejects(run(action, extra), error => {
        assert.equal(error.states.length, 2); return true;
      });
      assert.deepEqual(hashes(), beforeHashes); record(name, { hashes: beforeHashes });
    }
    for (const file of files) {
      const syntax = spawnSync(process.execPath, ['--check', file.staged], { encoding: 'utf8' });
      assert.equal(syntax.status, 0, syntax.stderr);
    }
    record('Both verified stages parse and match offline-6-google hashes');
    assert.throws(() => apply(source, directory, 'install'), /Paired installation is disabled/);
    assert.throws(() => apply(source, directory, 'install', opts), /Disposable isolation required/);
    record('Real target refused with and without disposable option');

    // Same isolated provider-free CLI load as check-stage, now through the installer.
    fs.symlinkSync(path.dirname(path.dirname(before.root)), path.join(work, 'node_modules'), 'junction');
    const blocker = path.join(work, 'no-network.cjs'), home = path.join(work, 'home');
    fs.mkdirSync(home);
    fs.writeFileSync(blocker, `const deny=()=>{throw new Error('Offline smoke forbids network/process creation')};
      globalThis.fetch=deny;require('node:net').Socket.prototype.connect=deny;require('node:tls').connect=deny;
      for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])require('node:child_process')[name]=deny;
      require('node:module').syncBuiltinESMExports();\n`);
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: work, TMP: work,
      HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home,
      PI_CODING_AGENT_DIR: path.join(home, 'agent'), PI_STALL_LOG_DIR: path.join(work, 'logs'),
      NODE_DISABLE_COMPILE_CACHE: '1', NO_COLOR: '1' };
    function smoke() {
      const h = hashes(); assert.ok(JSON.stringify(h) === JSON.stringify(originalHashes) || JSON.stringify(h) === JSON.stringify(patchedHashes), 'Never load mixed pair');
      const result = spawnSync(process.execPath, ['--require', blocker, path.join(root, 'dist/bundle/cli.js'), '--version'],
        { cwd: home, env, encoding: 'utf8', timeout: 15000 });
      assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), '0.87.1');
      assert.deepEqual(fs.readdirSync(home), []);
      return { exitCode: result.status, stdout: result.stdout.trim(), hashes: h, isolatedHomeEmpty: true, networkAndProcessesBlocked: true };
    }
    let patchedSmoke;
    assert.equal((await run('install', { smoke() { patchedSmoke = smoke(); } })).state, 'install');
    const installedStats = files.map(f => fs.statSync(f.target, { bigint: true }).mtimeNs.toString());
    assert.equal((await run('install')).state, 'already-install');
    assert.deepEqual(files.map(f => fs.statSync(f.target, { bigint: true }).mtimeNs.toString()), installedStats);
    record('Install and repeated install without rewriting; patched isolated CLI smoke', patchedSmoke);
    await run('rollback'); restored();
    const rolledStats = files.map(f => fs.statSync(f.target, { bigint: true }).mtimeNs.toString());
    assert.equal((await run('rollback')).state, 'already-rollback');
    assert.deepEqual(files.map(f => fs.statSync(f.target, { bigint: true }).mtimeNs.toString()), rolledStats);
    record('Rollback and repeated rollback without rewriting; restored isolated CLI smoke', smoke());

    for (const mixed of [['original', 'patched'], ['patched', 'original']]) {
      reset(mixed);
      const result = await run('install', { smoke() { assert.fail('Mixed pair must not load CLI'); } });
      assert.equal(result.state, 'recovered-originals-retry-install'); restored();
      await run('install'); await run('rollback'); restored();
      record('Mixed state recovery requires separate install: ' + mixed.join('/'), { finalHashes: hashes() });
    }
    for (const action of ['install', 'rollback']) for (const point of ['before', 'after']) for (let i = 0; i < 2; i++) {
      reset(action === 'rollback' ? ['patched', 'patched'] : undefined);
      let injected = false;
      await assert.rejects(run(action, { fault(p, index) { if (!injected && p === point && index === i) { injected = true; throw new Error('Injected replacement failure'); } } }), /Injected replacement failure/);
      assert.ok(injected);
      // No replacement before rollback's first write leaves patched/patched intact.
      if (action === 'rollback' && point === 'before' && i === 0) assert.deepEqual(hashes(), patchedHashes);
      else restored();
      await run('rollback'); restored();
      record(`Fault ${action} ${point} replacement ${i}; guarded restoration/repeated rollback`, { finalHashes: hashes() });
    }
    for (const action of ['install', 'rollback']) for (const point of ['before', 'after']) for (let i = 0; i < 2; i++) {
      reset(action === 'rollback' ? ['patched', 'patched'] : undefined);
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--interrupt', root, directory, action, point, String(i)], { encoding: 'utf8', timeout: 15000 });
      assert.equal(child.status, 73, child.stderr);
      const interruptedHashes = hashes();
      // Restart consults hashes even if persisted journal is truncated or lies.
      fs.writeFileSync(path.join(directory, 'recovery.jsonl'), '{"phase":"complete","states":"untrusted"}\n{');
      await run('rollback'); restored(); await run('rollback'); restored();
      record(`Process exit ${action} ${point} replacement ${i}; stale journal restart`, { exitCode: child.status, interruptedHashes, finalHashes: hashes() });
    }
    for (const mixed of [['patched', 'original'], ['original', 'patched']]) {
      reset(mixed); const i = mixed.indexOf('patched');
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--interrupt', root, directory, 'install', 'recovery-after', String(i)], { encoding: 'utf8', timeout: 15000 });
      assert.equal(child.status, 73, child.stderr);
      await run('rollback'); restored();
      record('Interrupted mixed recovery repeatable: ' + mixed.join('/'), { finalHashes: hashes() });
    }

    for (let i = 0; i < 2; i++) {
      for (const state of [['original', 'original'], ['patched', 'original'], ['original', 'patched']]) {
        reset(state); fs.writeFileSync(files[i].target, 'unknown bytes');
        await refused(`Unknown target ${i} in ${state.join('/')} preserves pair`, {});
      }
      for (const property of ['backup', 'staged']) for (const defect of ['missing', 'corrupt']) {
        reset(['patched', 'original']);
        if (defect === 'missing') fs.rmSync(files[i][property]); else fs.writeFileSync(files[i][property], 'corrupt');
        await refused(`${defect} ${property} ${i} blocks mixed recovery`, {});
      }
    }
    reset();
    for (const mutate of [m => { m.revision = 'offline-5'; delete m.targets; }, m => { m.revision = 'unknown'; },
      m => { m.activationAllowed = true; }, m => { m.targets.push(m.targets[0]); },
      m => { m.targets[1] = m.targets[0]; }, m => { m.targets[0].target += '/../escape'; },
      m => { m.targets[0].backup = files[1].backup; }, m => { m.targets[0].staged += '/../escape'; },
      m => { m.entryHash = 'drift'; }, m => { m.targets[0].patchedHash = 'drift'; },
      m => { m.targets[1].boundaries[0].sha256 = 'drift'; }, m => { m.target += '/../escape'; }]) {
      const m = JSON.parse(manifestBytes); mutate(m); fs.writeFileSync(manifestPath, JSON.stringify(m));
      await refused('Malformed/legacy/duplicate/escaping manifest refusal ' + evidence.checks.length, {});
      fs.writeFileSync(manifestPath, manifestBytes);
    }
    fs.writeFileSync(manifestPath, '{'); await refused('Malformed JSON manifest refusal', {}); fs.writeFileSync(manifestPath, manifestBytes);
    for (const relative of ['package.json', 'dist/bundle/cli.js', 'dist/bundle/cli-runtime.js', 'dist/bundle/chunks/google-vertex-O4YJEQUW.js']) {
      const target = path.join(root, relative), bytes = fs.readFileSync(target);
      fs.writeFileSync(target, relative === 'package.json' ? JSON.stringify({ name: 'drift', version: '9' }) : 'mapping drift');
      await refused('Version/entry/runtime/adapter drift refusal: ' + relative, {}); fs.writeFileSync(target, bytes);
    }
    await refused('Active fixture refusal', { inactive() { throw new Error('Target may be in use'); } });
    await refused('Inconclusive fixture refusal', { inactive() { throw new Error('Process inspection inconclusive'); } });
    await refused('Missing positive inactivity proof refusal', { inactive() {} });
    await refused('No smoke callback refusal', { smoke: undefined });
    for (const property of ['target', 'backup', 'staged']) {
      const link = path.join(work, 'linked-' + property);
      fs.linkSync(files[0][property], link);
      await refused('Hard-linked ' + property + ' refusal', {});
      fs.rmSync(link);
    }
    let calls = 0;
    await assert.rejects(run('install', { inactive() { if (++calls >= 4) throw new Error('Target may be in use'); return true; } }), /Target may be in use/);
    assert.deepEqual(hashes(), [patchedHashes[0], originalHashes[1]]);
    record('Inactivity lost between writes preserves mixed state and blocks unsafe restoration', { residualHashes: hashes(), checks: calls });
    await run('rollback'); restored();
    await assert.rejects(run('install', { fault(p, i) { if (p === 'before' && i === 1) fs.writeFileSync(files[1].target, 'concurrent unrelated bytes'); } }), error => {
      assert.match(error.recoveryError, /Unknown installed bytes/); assert.equal(error.states[1].state, 'unknown'); return true;
    });
    assert.equal(digest(files[0].target), patchedHashes[0]); assert.equal(fs.readFileSync(files[1].target, 'utf8'), 'concurrent unrelated bytes');
    record('Drift immediately before second replacement blocks write and unsafe recovery', { residualHashes: hashes() });
    reset();
    for (const property of ['backup', 'staged']) {
      await assert.rejects(run('install', { fault(p, i) { if (p === 'before' && i === 1) fs.writeFileSync(files[0][property], 'changed recovery material'); } }), error => {
        assert.match(error.recoveryError, /Stage\/backup drift/); return true;
      });
      assert.deepEqual(hashes(), [patchedHashes[0], originalHashes[1]]);
      record(property + ' drift between writes blocks replacement and restoration', { residualHashes: hashes() });
      // Restore only the test-damaged recovery material, then exercise real recovery.
      fs.writeFileSync(files[0][property], property === 'backup' ? originals[0] : patches[0]);
      await run('rollback'); restored();
    }
    await assert.rejects(run('install', { fault(p, i) {
      if (p === 'before' && i === 0) {
        const temporary = fs.readdirSync(path.dirname(files[0].target)).find(name => name.startsWith(path.basename(files[0].target) + '.stall-' + process.pid + '-'));
        assert.ok(temporary); fs.writeFileSync(path.join(path.dirname(files[0].target), temporary), 'changed temporary');
      }
    } }), /Temporary copy drift/);
    restored(); record('Temporary bytes revalidated immediately before rename');
    const collision = files[0].target + '.stall-' + process.pid + '-4242.tmp';
    fs.writeFileSync(collision, 'unrelated temporary bytes', { flag: 'wx' });
    const now = Date.now;
    try {
      Date.now = () => 4242;
      await assert.rejects(run('install'), /EEXIST/);
      assert.equal(fs.readFileSync(collision, 'utf8'), 'unrelated temporary bytes'); restored();
    } finally { Date.now = now; fs.rmSync(collision); }
    record('Exclusive temporary collision preserves pre-existing bytes');
    await assert.rejects(run('install', { fault(p, i) {
      if (p === 'before' && i === 1) fs.writeFileSync(manifestPath, manifestBytes.toString().replace('offline-6-google', 'unknown'));
    } }), error => { assert.match(error.recoveryError, /Manifest drift/); return true; });
    assert.deepEqual(hashes(), [patchedHashes[0], originalHashes[1]]);
    fs.writeFileSync(manifestPath, manifestBytes); await run('rollback'); restored();
    record('Manifest revalidated between writes; recovery resumes after verified metadata restored');
    let entered, release;
    const held = new Promise(resolve => { entered = resolve; }), wait = new Promise(resolve => { release = resolve; });
    const first = run('install', { async smoke() { entered(); await wait; } });
    await held;
    await refused('Kernel ownership refuses concurrent operation', {});
    release(); await first; await run('rollback'); restored();
    await assert.rejects(run('install', { smoke() { assert.deepEqual(hashes(), patchedHashes); throw new Error('Injected smoke failure'); } }), error => {
      assert.match(error.message, /Injected smoke failure/); assert.equal(error.restored, true); return true;
    });
    restored(); record('Post-install smoke failure restores both originals', { finalHashes: hashes() });
    await run('rollback'); restored(); record('Final restored isolated CLI smoke', smoke());
    assert.equal(sha256(inspect(source).bytes), sha256(before.bytes));
    assert.equal(sha256(inspectGoogle(inspect(source)).bytes), sha256(google.bytes));
    record('Read-source main/SDK/adapters/entry remain unchanged');
    evidence.sourceHashes = Object.fromEntries(['install.mjs', 'check-pair.mjs', 'stage.mjs', 'logger.mjs', 'check-google.mjs', 'check-correlation.mjs', 'check-stage.mjs', 'check-turns.mjs'].map(name => [name, digest(fileURLToPath(new URL(name, import.meta.url)))]));
    const previous = JSON.parse(fs.readFileSync(new URL('../../docs/works/pi-stall-diagnostics/evidence/reconciliation-offline-6.json', import.meta.url), 'utf8'));
    for (const name of ['stage.mjs', 'logger.mjs', 'check-google.mjs', 'check-correlation.mjs', 'check-stage.mjs', 'check-turns.mjs']) {
      assert.equal(evidence.sourceHashes[name], previous.sourceHashes[name], 'T1-G reuse requires unchanged source: ' + name);
    }
    evidence.reusedEvidenceHashes = {};
    for (const [name, hash] of Object.entries(previous.evidenceHashes)) {
      const current = digest(new URL('../../docs/works/pi-stall-diagnostics/evidence/' + name, import.meta.url));
      assert.equal(current, hash); evidence.reusedEvidenceHashes[name] = current;
    }
    evidence.changedSources = ['install.mjs replaced; historical installer hash/evidence superseded by this check', 'check-pair.mjs added'];
    record('T1-G source/evidence hashes unchanged; paired recovery supersedes legacy installer evidence');
    evidence.finalStates = files.map(f => ({ file: path.basename(f.target), hash: digest(f.target), state: 'original' }));
    evidence.status = 'passed'; evidence.t1Complete = true; persist();
  } catch (error) {
    evidence.status = 'failed'; evidence.failure = { message: error.message, states: error.states, recoveryError: error.recoveryError }; persist(); throw error;
  }
}
