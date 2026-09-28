import assert from 'node:assert/strict';
import fs from 'node:fs';
import { liveCompatibility, liveRoot, verifiedLauncher } from './install.mjs';

const launcher = fs.readFileSync('D:/Applications/Scoop/apps/pi-coding-agent-bun/current/pi.cmd', 'utf8');
assert.equal(verifiedLauncher(launcher), true);
assert.equal(verifiedLauncher(launcher.replace('bun --inspect ', 'bun ')), true);
for (const drift of [
  launcher.replace('bun --inspect ', 'node --inspect '),
  launcher.replace('--inspect ', '--inspect=0.0.0.0:9229 '),
  launcher.replace('--inspect ', '--inspect-brk '),
  launcher.replace('--inspect ', '--inspect --watch '),
  launcher.replace('cli.js', 'other.js'),
  launcher.replace('%~dp0', 'D:\\other\\'),
  launcher.replace(' %*', ' -- %*'),
  launcher + 'echo extra\r\n',
]) assert.equal(verifiedLauncher(drift), false);
assert.equal(liveCompatibility(liveRoot()), true);
console.log('Exact launcher forms and live compatibility: passed');
