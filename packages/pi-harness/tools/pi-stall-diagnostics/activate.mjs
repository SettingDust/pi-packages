import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyLive, liveRoot, liveSource, liveCompatibility, processMetadata, blockers, classify, classifyAwaits, prepareAwaits, applyAwaitsLive } from './install.mjs';
import { inspect, inspectGoogle, instrument, instrumentGoogle, sha256, stage } from './stage.mjs';

export function status(expanded = false) {
  const root = liveRoot(), states = expanded ? classifyAwaits(root) : classify(root);
  const occupied = blockers(processMetadata(), root);
  const result = { observedAt: new Date().toISOString(), root, states, runtimeProcesses: occupied,
    admission: 'Known revisions are compatible across cached main and lazy SDK imports; process occupancy is informational.',
    inactivityEstablished: occupied.length === 0, loggingEnabled: states.every(s => s.state === 'original') ? false : null,
    loggingNote: 'Original bytes contain no kit logger. Patched bytes require opt-in in a new process; existing process environments are not inspected.' };
  if (states.every(s => s.state === 'original')) {
    const main = inspect(root), google = inspectGoogle(main);
    const patched = instrument(main.bytes.toString('utf8'), fs.readFileSync(new URL('./logger.mjs', import.meta.url), 'utf8'));
    const sdk = instrumentGoogle(google.bytes.toString('utf8'), google.citations);
    result.source = { version: main.version, entryHash: main.entryHash, runtimeHash: main.runtimeHash,
      mainBoundaries: patched.boundaries.length, googleBoundaries: sdk.boundaries.length,
      stagedHashes: [sha256(patched.source), sha256(sdk.source)] };
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [action, directory, evidenceFile] = process.argv.slice(2);
  try {
    let result;
    if (action === 'status') result = status();
    else if (action === 'status-awaits') result = status(true);
    else if (action === 'prepare-awaits') {
      if (!directory) throw new Error('New recovery directory required');
      result = prepareAwaits(directory);
    } else if (['install-awaits', 'rollback-awaits', 'pristine-awaits'].includes(action)) {
      if (!directory) throw new Error('Recovery directory required');
      result = await applyAwaitsLive(directory, action.replace('-awaits', ''));
    }
    else if (action === 'prepare') {
      const root = liveRoot(); liveCompatibility(root);
      if (!directory) throw new Error('Stage directory required');
      // Caller creates an empty directory outside the installation; never overwrite.
      result = stage(root, directory);
      liveCompatibility(root);
    } else if (['install', 'rollback'].includes(action)) {
      if (!directory) throw new Error('Stage directory required');
      result = await applyLive(directory, action);
    } else throw new Error('Usage: node activate.mjs status|prepare|install|rollback STAGE_DIR [EVIDENCE_JSON]');
    if (evidenceFile) fs.writeFileSync(evidenceFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Error messages originate in guards, never CLI/provider output or commands.
    console.error(JSON.stringify({ status: 'blocked', reason: error.message,
      states: error.states ?? (action?.endsWith('-awaits') ? classifyAwaits(liveSource) : classify(liveSource)), recoveryError: error.recoveryError }, null, 2));
    process.exitCode = 1;
  }
}
