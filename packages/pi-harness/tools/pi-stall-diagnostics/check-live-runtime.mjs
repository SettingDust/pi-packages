import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { disposable, liveSource, classify } from './install.mjs';
import { sha256 } from './stage.mjs';
import { smoke } from './smoke.mjs';

const evidenceFile = process.argv[2];
assert.ok(evidenceFile);
assert.equal(process.platform, 'win32');
assert.equal(process.versions.bun, '1.4.0', 'Run with the actual Pi launcher runtime');
const before = classify(liveSource), fixture = disposable(liveSource), files = fixture.manifest.targets;
// Resolve unchanged dependencies outside the copied package, as in the existing pair check.
fs.symlinkSync(path.dirname(path.dirname(fs.realpathSync(liveSource))), path.join(fixture.work, 'node_modules'), 'junction');
const evidence = { runtime: { executable: process.execPath, bun: process.versions.bun }, fixture: fixture.work,
  sourceStates: before, checks: [], sourceHashes: {}, status: 'running' };
const save = () => fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
save();
try {
  for (const file of files) {
    const original = fs.readFileSync(file.backup, 'utf8'), patched = fs.readFileSync(file.staged, 'utf8');
    assert.equal(original.slice(original.lastIndexOf('export{')), patched.slice(patched.lastIndexOf('export{')));
  }
  evidence.checks.push({ name: 'Both export contracts byte-identical' });
  for (const states of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    files.forEach((file, i) => fs.copyFileSync(states[i] ? file.staged : file.backup, file.target));
    const result = smoke(fixture.root);
    assert.equal(result.probe.loggingRecords, states[0] ? 2 : 0);
    evidence.checks.push({ name: 'Actual Bun main/SDK combination', states, smoke: result }); save();
  }
  // Held descriptor and cached modules observe complete old bytes after Windows rename.
  // Probe only disposable files; never perform this experiment on installed bytes.
  const moduleFile = path.join(fixture.work, 'cache-probe.mjs');
  fs.writeFileSync(moduleFile, 'export const value=1;\n');
  const cached = await import(pathToFileURL(moduleFile));
  const fd = fs.openSync(moduleFile, 'r');
  let sharing;
  const replacement = moduleFile + '.tmp'; fs.writeFileSync(replacement, 'export const value=2;\n', { flag: 'wx' });
  try {
    try { fs.renameSync(replacement, moduleFile); sharing = 'replacement allowed with open reader'; }
    catch (error) {
      assert.equal(error.code, 'EPERM');
      assert.equal(fs.readFileSync(moduleFile, 'utf8'), 'export const value=1;\n');
      sharing = 'open reader refuses replacement with EPERM and preserves original';
    }
    assert.equal(fs.readFileSync(fd, 'utf8'), 'export const value=1;\n');
  } finally { fs.closeSync(fd); }
  if (fs.existsSync(replacement)) fs.renameSync(replacement, moduleFile);
  assert.equal(await import(pathToFileURL(moduleFile)), cached);
  assert.equal(fs.readFileSync(moduleFile, 'utf8'), 'export const value=2;\n');
  assert.equal((await import(pathToFileURL(moduleFile).href + '?fresh')).value, 1);
  evidence.checks.push({ name: 'Windows sharing and cached-module replacement', sharing, cachedModuleUnchanged: true, queryDoesNotReloadBunModule: true, diskHasReplacement: true });
  // Both staged SDK versions are self-contained: token and optional argument changes
  // stay in one file. Old main has no subscriber; old SDK sends no notification.
  assert.deepEqual(classify(liveSource), before);
  for (const name of ['stage.mjs', 'logger.mjs', 'smoke.mjs', 'smoke-probe.mjs', 'check-live-runtime.mjs']) evidence.sourceHashes[name] = sha256(fs.readFileSync(new URL(name, import.meta.url)));
  evidence.status = 'passed'; save(); console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks.length, evidenceFile }));
} catch (error) { evidence.status = 'failed'; evidence.error = error.message; save(); throw error; }
