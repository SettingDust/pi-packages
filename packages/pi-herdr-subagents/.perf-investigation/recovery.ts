// Diagnostic harness: reads source artifacts, recovers temporary copies, launches no child.
// bun recovery.ts <tasks-directory> [working|baseline|working-no-image-cleanup] [passes]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const source = resolve(process.argv[2] ?? '');
const mode = process.argv[3] ?? 'working';
const passes = Number(process.argv[4] ?? 2);
assert.ok(process.argv[2] && existsSync(source), 'Provide an existing tasks directory');
assert.ok(['working', 'baseline', 'working-no-image-cleanup'].includes(mode), 'Unknown comparison mode');
assert.ok(Number.isSafeInteger(passes) && passes > 0, 'Passes must be a positive integer');
const root = mkdtempSync(join(tmpdir(), 'subagent-recovery-perf-'));
const tasksDir = join(root, 'tasks');
const baselinePath = fileURLToPath(new URL('./baseline.ts', import.meta.url));
let runtime: any;
const oldWarn = console.warn;
try {
  mkdirSync(tasksDir);
  let records = 0, imageDirectories = 0;
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('-artifacts')) continue;
    const from = join(source, entry.name), to = join(tasksDir, entry.name);
    const path = join(from, 'task.json');
    if (!existsSync(path)) continue;
    let record: any;
    try { record = JSON.parse(readFileSync(path, 'utf8')); }
    catch { continue; }
    assert.ok(['completed', 'failed', 'cancelled'].includes(record.status), 'Use terminal-only fixtures');
    mkdirSync(to);
    record.sessionFile = join(tasksDir, record.subagentId + '-g1.jsonl');
    writeFileSync(join(to, 'task.json'), JSON.stringify(record));
    const result = 'result-' + record.generation + '.json';
    if (existsSync(join(from, result))) cpSync(join(from, result), join(to, result));
    imageDirectories += readdirSync(from).filter(name => name.startsWith('image-input-')).length;
    records++;
  }
  assert.equal(imageDirectories, 0, 'This comparison isolates tasks without image envelopes');
  if (mode === 'baseline') {
    const baseline = execFileSync('git', ['show', 'HEAD:packages/pi-herdr-subagents/src/index.ts'], { encoding: 'utf8' });
    writeFileSync(baselinePath, baseline);
  }
  const { SubagentRuntime, AgentRegistry } = await import(mode === 'baseline' ? './baseline.ts' : '../src/index.ts');
  let transportCalls = 0, notifications = 0;
  const transport = {
    async createTab() { throw new Error('Unexpected launch'); },
    async run() { throw new Error('Unexpected launch'); },
    async sendText() { throw new Error('Unexpected launch'); },
    async closePane() { transportCalls++; },
    async closeTab() { transportCalls++; return 'already_closed'; },
    async paneExists() { transportCalls++; return false; },
  };
  runtime = new SubagentRuntime(transport, new AgentRegistry(), root, () => { notifications++; });
  // Counterfactual in this disposable process only; production code remains unchanged.
  if (mode === 'working-no-image-cleanup') runtime.cleanupImageInputs = () => true;
  const counts: Record<string, number> = {};
  const time: Record<string, number> = {};
  for (const name of ['persist', 'readResult', 'cleanupImageInputs']) {
    if (typeof runtime[name] !== 'function') continue;
    const original = runtime[name].bind(runtime);
    runtime[name] = (...args: unknown[]) => {
      counts[name] = (counts[name] ?? 0) + 1;
      const start = performance.now();
      const value = original(...args);
      if (value instanceof Promise) return value.finally(() => { time[name] = (time[name] ?? 0) + performance.now() - start; });
      time[name] = (time[name] ?? 0) + performance.now() - start;
      return value;
    };
  }
  let warnings = 0;
  console.warn = () => { warnings++; };
  const mb = (n: number) => Math.round(n / 1024 / 1024 * 10) / 10;
  for (let pass = 1; pass <= passes; pass++) {
    Bun.gc(true);
    const startMem = process.memoryUsage();
    for (const name of Object.keys(counts)) { counts[name] = 0; time[name] = 0; }
    notifications = transportCalls = warnings = 0;
    const cpu = process.cpuUsage();
    const start = performance.now();
    await runtime.recover(process.cwd());
    const elapsed = performance.now() - start;
    const used = process.cpuUsage(cpu);
    const endMem = process.memoryUsage();
    assert.equal(runtime.listTasks().length, records, 'Every historical task must be recovered');
    assert.equal(runtime.listTasks().filter((t: any) => t.status === 'running' || t.status === 'queued').length, 0);
    let retainedResultBytes = 0;
    for (const task of runtime.tasks.values()) retainedResultBytes += Buffer.byteLength(task.result ?? '', 'utf8');
    Bun.gc(true);
    console.log(JSON.stringify({ mode, pass, records, imageDirectories, elapsedMs: Math.round(elapsed), cpuMs: Math.round((used.user + used.system) / 1000), counts, timeMs: Object.fromEntries(Object.entries(time).map(([k,v]) => [k,Math.round(v)])), transportCalls, notifierCalls: notifications, warnings, retainedResultMB: mb(retainedResultBytes), monitors: runtime.monitors.size, imageCleanupClosures: runtime.imageCleanups?.size ?? 0, pendingSettlements: runtime.pendingSettlements.size, heapBeforeMB: mb(startMem.heapUsed), heapAfterMB: mb(endMem.heapUsed), heapAfterGcMB: mb(process.memoryUsage().heapUsed), rssMB: mb(endMem.rss) }));
  }
} finally {
  console.warn = oldWarn;
  runtime?.stop();
  rmSync(root, { recursive: true, force: true });
  if (mode === 'baseline') rmSync(baselinePath, { force: true });
}
