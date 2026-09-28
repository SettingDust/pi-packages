import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { blockers, processMetadata, liveRoot, liveCompatibility, applyLive, apply, disposable, classify } from './install.mjs';
import { smoke } from './smoke.mjs';
import { sha256 } from './stage.mjs';

const [evidenceFile] = process.argv.slice(2);
assert.ok(evidenceFile, 'Usage: node check-activation.mjs EVIDENCE_JSON');
const root = liveRoot(), self = { ProcessId: 100, Name: 'node.exe', ExecutablePath: null };
const checks = [];
for (const name of ['node.exe', 'bun.exe', 'pi.exe', 'nodejs.exe']) {
  const result = blockers([self, { ProcessId: 200, Name: name, ExecutablePath: null }], root, 100);
  assert.equal(result.length, 1); assert.equal(result[0].executable, null);
}
assert.equal(blockers([self, { ProcessId: 200, Name: 'other.exe', ExecutablePath: root + '/other.exe' }], root, 100).length, 1);
assert.deepEqual(blockers([self, { ProcessId: 200, Name: 'explorer.exe', ExecutablePath: null }], root, 100), []);
for (const input of [[], null, [self, { ProcessId: 200 }], [{ ProcessId: 200, Name: 'node.exe' }]]) {
  assert.throws(() => blockers(input, root, 100), /inconclusive/);
}
checks.push('Metadata classifier preserves informational runtime inventory and rejects incomplete snapshots');
const before = classify(root), occupied = blockers(processMetadata(), root);
assert.equal(liveCompatibility(root), true);
assert.throws(() => liveCompatibility(path.dirname(root)), /verified Bun/);
const fixture = disposable(root);
// A disposable manifest cannot target live files, even with extra bypass options.
await assert.rejects(applyLive(fixture.directory, 'install', { inactive: () => true, disposable: true }), /Invalid pair manifest/);
assert.deepEqual(classify(root), before);
checks.push('Compatibility admission succeeds despite occupancy; wrong root and disposable live manifest refuse without mutation');
fs.symlinkSync(path.dirname(path.dirname(root)), path.join(fixture.work, 'node_modules'), 'junction');
const options = { disposable: true, inactive: () => true, smoke };
const installed = await apply(fixture.root, fixture.directory, 'install', options);
assert.ok(installed.states.every(s => s.state === 'patched'));
const repeat = await apply(fixture.root, fixture.directory, 'install', options);
assert.equal(repeat.state, 'already-install');
const patchedSmoke = smoke(fixture.root);
const restored = await apply(fixture.root, fixture.directory, 'rollback', options);
assert.ok(restored.states.every(s => s.state === 'original'));
const restoredSmoke = smoke(fixture.root);
assert.deepEqual(classify(root), before);
checks.push('Shared pair engine install/idempotence/rollback with new fixed isolated smoke succeeds on disposable bytes');
await assert.rejects(apply(fixture.root, fixture.directory, 'install', { ...options, smoke() {
  fs.copyFileSync(fixture.manifest.targets[0].backup, fixture.manifest.targets[0].target);
} }), /Pair changed during operation/);
assert.ok(classify(fixture.root).every(s => s.state === 'original'));
checks.push('Known-byte drift during smoke cannot report stale successful state; guarded restoration returns both originals');
const sourceHashes = Object.fromEntries(['install.mjs', 'activate.mjs', 'smoke.mjs', 'check-activation.mjs'].map(name => [name, sha256(fs.readFileSync(new URL(name, import.meta.url)))]));
fs.writeFileSync(evidenceFile, JSON.stringify({ status: 'passed', observedAt: new Date().toISOString(), checks,
  sourceHashes, blockers: occupied, finalRealStates: classify(root), finalDisposableStates: restored.states,
  patchedSmoke, restoredSmoke, loggingEnabled: false,
  limitations: ['This check mutates only disposable targets; real manifest mismatch is rejected before writes.',
    'Mutex serializes installers only; both known main/SDK combinations were independently checked.',
    'Live rollback drill is not required by the latest authorization; disposable exact restoration remains verified.'] }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'passed', evidenceFile, checks }, null, 2));
