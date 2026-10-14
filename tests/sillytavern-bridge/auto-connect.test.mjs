import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createGateway } from '../../plugins/sillytavern-bridge/lib/gateway.js';
import { createRuntime } from '../../plugins/sillytavern-bridge/lib/index.js';
import { installTavernExtension } from '../../plugins/sillytavern-bridge/lib/extension-installer.js';
import { connectTavern, readHandoff } from '../../plugins/sillytavern-bridge/lib/tavern-extension.js';
import { localUrl } from '../../plugins/sillytavern-bridge/lib/config.js';

const generated = () => randomBytes(32).toString('hex');
const digest = async value => createHash('sha256').update(value).digest('hex');
async function gatewayFixture(t, options = {}) {
  const key = generated();
  const gateway = createGateway({ key, port: 0, tavernPort: 18765, llm: { listProviders: () => [{ id: 'synthetic' }], listModels: async () => [{ id: 'model' }] }, ...options });
  await gateway.start(); t.after(() => gateway.close());
  const call = (token, origin = localUrl(18765).slice(0, -1)) => fetch(localUrl(gateway.port, '/bridge/connect'), { method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), Authorization: `Bearer ${token}` } });
  return { gateway, key, call };
}

test('handoff is Origin restricted, one-use, expiring, and separate from the persistent API key', async t => {
  let now = 1000;
  const { gateway, key, call } = await gatewayFixture(t, { now: () => now, handoffTtlMs: 50 });
  assert.equal((await call(key)).status, 401);
  assert.equal((await call(gateway.issueHandoff(), 'https://example.invalid')).status, 403);
  assert.equal((await call(gateway.issueHandoff(), '')).status, 401);
  const expired = gateway.issueHandoff(); now += 51;
  assert.equal((await call(expired)).status, 401);
  const token = gateway.issueHandoff();
  assert.equal((await fetch(localUrl(gateway.port, '/v1/models'), { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  const results = await Promise.all([call(token), call(token)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
  const response = results.find(r => r.ok);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { key, models: [{ id: 'synthetic/model', object: 'model', created: 0, owned_by: 'synthetic' }] });
});

test('empty model catalog does not hand out a key', async t => {
  const { gateway, call, key } = await gatewayFixture(t, { llm: { listProviders: () => [] } });
  const response = await call(gateway.issueHandoff());
  assert.equal(response.status, 409); assert.ok(!(await response.text()).includes(key));
});

test('handoff URL accepts only a bounded loopback port and a random token', () => {
  const token = generated();
  assert.deepEqual(readHandoff(`#dsh-bridge=18765.${token}`), { port: 18765, token });
  for (const hash of ['', '#dsh-bridge=80.' + token, '#dsh-bridge=99999.' + token, '#dsh-bridge=18765.bad', '#other=' + token]) assert.equal(readHandoff(hash), null);
});

function browserFixture(extra = {}) {
  const key = generated(), events = [], secrets = [{ id: 'prior-key', active: true }];
  const settings = { chat_completion_source: 'openai', custom_url: 'https://example.invalid/v1', custom_model: 'synthetic/model', custom_include_headers: 'X-Test: synthetic', custom_include_body: 'synthetic', custom_exclude_body: 'model', temperature: 0.7 };
  const native = {
    settings, power: { auto_connect: false }, extensions: {}, mainApi: () => 'kobold', customSecrets: () => secrets,
    save: async () => { events.push('save'); }, verify: async () => { events.push('verify'); },
    writeKey: async () => { events.push('key'); secrets[0].active = false; secrets.push({ id: 'bridge-key', active: true }); return 'bridge-key'; },
    ...extra,
  };
  const options = { handoff: { port: 18765, token: generated() }, digest,
    fetchPage: async () => Response.json({ key, models: [{ id: 'synthetic/model' }] }), native,
    ui: { prepare: () => events.push('prepare'), select: () => events.push('select'), connect: () => events.push('connect') },
  };
  return { key, options, native, events, settings, secrets };
}

test('native auto-connect backs up current user fields, saves local key and verifies persistence before Connect', async () => {
  const f = browserFixture(), previous = structuredClone(f.settings);
  await connectTavern(f.options);
  assert.deepEqual(f.events, ['save', 'key', 'prepare', 'select', 'save', 'verify', 'connect']);
  assert.deepEqual(f.native.extensions.dsh_tavern_bridge.previousConnection.settings, Object.fromEntries(Object.entries(previous).filter(([name]) => name !== 'temperature')));
  assert.equal(f.native.extensions.dsh_tavern_bridge.previousConnection.secretId, 'prior-key');
  assert.equal(f.settings.custom_url, localUrl(18765, '/v1')); assert.equal(f.settings.custom_model, 'synthetic/model');
  assert.equal(f.settings.custom_include_headers, ''); assert.equal(f.settings.custom_exclude_body, ''); assert.equal(f.settings.temperature, 0.7);
  assert.equal(f.native.power.auto_connect, true);
  assert.ok(!JSON.stringify(f.native.extensions).includes(f.key));
  f.events.length = 0;
  await connectTavern(f.options);
  assert.ok(!f.events.includes('key')); assert.equal(f.secrets.length, 2);
});

test('unavailable previous model selects a shared model; failed key or settings save never clicks Connect', async () => {
  const f = browserFixture(); f.settings.custom_model = 'missing/model';
  await connectTavern(f.options); assert.equal(f.settings.custom_model, 'synthetic/model');
  for (const extra of [{ writeKey: async () => null }, { save: async () => { throw new Error('save failed'); } }, { verify: async () => { throw new Error('not saved'); } }]) {
    const broken = browserFixture(extra);
    await assert.rejects(connectTavern(broken.options)); assert.ok(!broken.events.includes('connect'));
  }
});

test('failed or empty handoff never changes native settings or saves secrets', async () => {
  for (const fetchPage of [async () => new Response('', { status: 401 }), async () => Response.json({ key: generated(), models: [] })]) {
    const f = browserFixture(), before = structuredClone(f.settings); f.options.fetchPage = fetchPage;
    await assert.rejects(connectTavern(f.options)); assert.deepEqual(f.settings, before); assert.deepEqual(f.events, []);
  }
});

async function installation(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tavern-auto-connect-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('extension installation is idempotent, contains no key and refuses modified or unrelated files', async t => {
  const directory = await installation(t);
  await installTavernExtension(directory);
  const target = path.join(directory, 'public', 'scripts', 'extensions', 'third-party', 'dsh-tavern-bridge');
  await installTavernExtension(directory);
  assert.deepEqual((await fs.readdir(target)).sort(), ['index.js', 'manifest.json']);
  await fs.appendFile(path.join(target, 'index.js'), '\n// user edit');
  await assert.rejects(installTavernExtension(directory), /不会覆盖/);
});

test('extension installer refuses directory symlinks', async t => {
  const directory = await installation(t), outside = await installation(t);
  try { await fs.symlink(outside, path.join(directory, 'public'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('Symlink permission unavailable'); return; } throw error; }
  await assert.rejects(installTavernExtension(directory), /目录/); assert.deepEqual(await fs.readdir(outside), []);
});

test('shared startup installs helper even for a running Tavern and issues fresh handoffs on reopening', async () => {
  const calls = []; let sequence = 0;
  const runtime = createRuntime({ llm: {}, store: { load: async () => ({ sharingEnabled: true, gatewayPort: 18765 }), gatewayKey: async () => generated() },
    inspect: async () => ({ version: '1.19.0' }), installExtension: async () => calls.push('install'),
    launcher: { ensureStarted: async () => { calls.push('reuse'); return { status: 'ready', url: localUrl(18766), reused: true }; } },
    gatewayFactory: () => ({ start: async () => calls.push('gateway'), issueHandoff: () => String(++sequence), close: async () => {} }),
  });
  const first = await runtime.ensureStarted(), second = await runtime.ensureStarted();
  assert.deepEqual(calls, ['install', 'reuse', 'gateway', 'install', 'reuse']);
  assert.notEqual(first.url, second.url); assert.equal(new URL(first.url).pathname, '/'); await runtime.dispose();
});

test('unsupported Tavern version fails before any writes or startup', async () => {
  const runtime = createRuntime({ store: { load: async () => ({ sharingEnabled: true }) }, inspect: async () => ({ version: 'unknown' }),
    installExtension: async () => assert.fail('must not write'), launcher: { ensureStarted: async () => assert.fail('must not launch') },
  });
  await assert.rejects(runtime.ensureStarted(), /1.19.0/); await runtime.dispose();
});
