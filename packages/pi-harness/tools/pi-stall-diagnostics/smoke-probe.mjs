// Runs only inside smoke's credential-free, network/process-blocked child.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], chunks = path.join(root, 'dist/bundle/chunks');
const mainUrl = pathToFileURL(path.join(chunks, 'chunk-OJP47DM6.js')).href;
const main = await import(mainUrl);
for (const file of ['google-generative-ai-IMS5EK2Y.js', 'google-vertex-O4YJEQUW.js']) await import(pathToFileURL(path.join(chunks, file)).href);
assert.equal((await import(mainUrl)).SessionManager, main.SessionManager);
// Exercise the actual append boundary without constructing or persisting a session.
let appended;
const receiver = { sessionId: 'offline-fixture', byId: new Map(), leafId: null, _appendEntry(entry) { appended = entry; } };
const message = { role: 'user', content: 'OFFLINE_PRIVATE_SENTINEL', timestamp: 0 };
const id = main.SessionManager.prototype.appendMessage.call(receiver, message);
assert.equal(appended.message, message); assert.equal(appended.id, id);
const directory = process.env.PI_STALL_LOG_DIR;
const records = fs.existsSync(directory) ? fs.readdirSync(directory).flatMap(file => fs.readFileSync(path.join(directory, file), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)) : [];
const patched = fs.readFileSync(path.join(chunks, 'chunk-OJP47DM6.js'), 'utf8').includes('const __sd=');
assert.deepEqual(records.map(r => r.event), patched ? ['append.enter', 'append.exit'] : []);
assert.ok(!JSON.stringify(records).includes('OFFLINE_PRIVATE_SENTINEL'));
console.log(JSON.stringify({ mainAndBothLazyAdaptersImported: true, appendIdentityPreserved: true, loggingRecords: records.length, sessionCreated: false }));
