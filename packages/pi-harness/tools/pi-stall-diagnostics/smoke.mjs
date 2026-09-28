import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Provider-free smoke only. Never inherits credentials, extensions or user state.
export function smoke(root) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-stall-smoke-'));
  const home = path.join(work, 'home'), blocker = path.join(work, 'block.cjs');
  fs.mkdirSync(home);
  fs.writeFileSync(blocker, `const deny=()=>{throw new Error('Offline smoke forbids network/process creation')};
globalThis.fetch=deny;
require('node:net').Socket.prototype.connect=deny;
require('node:tls').connect=deny;
require('node:dgram').createSocket=deny;
for(const name of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])require('node:child_process')[name]=deny;
require('node:module').syncBuiltinESMExports();\n`, { flag: 'wx' });
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: work, TMP: work,
    HOME: home, USERPROFILE: home, APPDATA: home, LOCALAPPDATA: home,
    PI_CODING_AGENT_DIR: path.join(home, 'agent'), PI_STALL_LOG_DIR: path.join(work, 'logs'),
    BUN_INSTALL_CACHE_DIR: path.join(work, 'bun-cache'), BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(work, 'bun-transpiler'),
    NODE_DISABLE_COMPILE_CACHE: '1', NO_COLOR: '1' };
  const result = spawnSync(process.execPath, ['--require', blocker, path.join(root, 'dist/bundle/cli.js'), '--version'],
    { cwd: home, env, encoding: 'utf8', timeout: 15000 });
  if (result.status !== 0 || result.stdout.trim() !== '0.87.1' || fs.readdirSync(home).length) {
    throw new Error('Isolated provider-free CLI smoke failed');
  }
  const probe = spawnSync(process.execPath, ['--require', blocker, fileURLToPath(new URL('./smoke-probe.mjs', import.meta.url)), root],
    { cwd: home, env, encoding: 'utf8', timeout: 15000 });
  if (probe.status !== 0 || fs.readdirSync(home).length) throw new Error('Isolated runtime/logging probe failed');
  return { version: '0.87.1', runtime: { executable: process.execPath, node: process.version, bun: process.versions.bun },
    isolatedHomeEmpty: true, networkAndProcessesBlocked: true, probe: JSON.parse(probe.stdout), work };
}
