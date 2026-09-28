import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspect, inspectGoogle, stage, sha256 } from './stage.mjs';

const [root, evidenceFile] = process.argv.slice(2);
assert.ok(root && evidenceFile, 'Usage: node check-stage.mjs TARGET_ROOT EVIDENCE_JSON');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-stall-stage-'));
const before = inspect(root);
const manifest = stage(root, work); // Unique selectors and exact boundary shapes are checked here.
assert.equal(manifest.boundaries.length, 9);
for (const file of manifest.targets) {
  const syntax = spawnSync(process.execPath, ['--check', file.staged], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
}
const fixture = path.join(work, 'fixture');
fs.cpSync(before.root, fixture, { recursive: true });
// External dependencies are read-only; only the copied pair is replaced.
fs.symlinkSync(path.dirname(path.dirname(before.root)), path.join(work, 'node_modules'), 'junction');
const target = path.join(fixture, path.relative(before.root, before.target));
for (const file of manifest.targets) {
  const copied = path.join(fixture, path.relative(before.root, file.target));
  assert.equal(sha256(fs.readFileSync(copied)), file.originalHash);
  fs.copyFileSync(file.staged, copied);
  assert.equal(sha256(fs.readFileSync(copied)), file.patchedHash);
}
const blocker = path.join(work, 'no-network.cjs');
fs.writeFileSync(blocker, `const deny=()=>{throw new Error('Offline smoke forbids network/process creation')};
globalThis.fetch=deny;
require('node:net').Socket.prototype.connect=deny;
require('node:tls').connect=deny;
for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])require('node:child_process')[name]=deny;
require('node:module').syncBuiltinESMExports();\n`);
const home = path.join(work, 'home'); fs.mkdirSync(home);
const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: work, TMP: work,
  HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home,
  PI_CODING_AGENT_DIR: path.join(home, 'agent'), PI_STALL_LOG_DIR: path.join(work, 'logs'),
  NODE_DISABLE_COMPILE_CACHE: '1', NO_COLOR: '1' };
const args = ['--require', blocker, path.join(fixture, 'dist/bundle/cli.js'), '--version'];
const smoke = spawnSync(process.execPath, args, { cwd: home, env, encoding: 'utf8', timeout: 15000 });
assert.equal(smoke.status, 0, smoke.stderr);
assert.equal(smoke.stdout.trim(), '0.87.1');
assert.deepEqual(fs.readdirSync(home), [], 'Version smoke must not create user state');
assert.equal(sha256(inspect(root).bytes), manifest.originalHash);
assert.equal(sha256(inspectGoogle(inspect(root)).bytes), manifest.targets[1].originalHash);
// Guard checks use only disposable bytes.
fs.writeFileSync(target, 'unsupported fixture bytes');
assert.throws(() => inspect(fixture), /Unsupported bundle SHA-256/);
fs.copyFileSync(path.join(work, 'patched.mjs'), target);
const sdkTarget = path.join(fixture, path.relative(before.root, manifest.targets[1].target));
fs.copyFileSync(manifest.targets[0].backup, target);
fs.writeFileSync(sdkTarget, 'unsupported SDK fixture bytes');
assert.throws(() => inspectGoogle(inspect(fixture)), /Google source hash drift/);
fs.copyFileSync(manifest.targets[1].staged, sdkTarget);
fs.copyFileSync(manifest.targets[0].staged, target);
assert.throws(() => stage(root, work), /EEXIST/);
const result = { status: 'passed', scope: '0.87.1 staging compatibility and disposable CLI load only',
  activationAllowed: false, t1Complete: false, node: process.version,
  command: ['node', 'packages/pi-harness/tools/pi-stall-diagnostics/check-stage.mjs', root, evidenceFile],
  stageDirectory: work, manifest,
  smoke: { command: [process.execPath, ...args], exitCode: smoke.status, stdout: smoke.stdout.trim(),
    isolatedHomeEmpty: true, networkAndChildProcessBlocker: blocker },
  checks: ['exact version/hash/import mapping', 'nine unique boundary selectors and shapes', 'patched syntax',
    'disposable patched CLI --version with isolated empty home and network/process creation blocked',
    'unknown main and SDK hash refusal', 'exclusive stage writes', 'unchanged installed main/SDK/adapter hashes'],
  remaining: ['Google runtime and changed-code performance are verified separately; see current evidence',
    'T1-P paired installer recovery', 'T2 independently authorized activation'] };
fs.mkdirSync(path.dirname(path.resolve(evidenceFile)), { recursive: true });
fs.writeFileSync(evidenceFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ evidenceFile, stageDirectory: work, originalHash: manifest.originalHash,
  patchedHash: manifest.patchedHash, boundaries: manifest.boundaries.length, smoke: smoke.stdout.trim() }, null, 2));
