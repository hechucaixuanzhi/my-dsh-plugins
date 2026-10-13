import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ConfigStore, normalizeConfig, localUrl } from '../../plugins/sillytavern-bridge/lib/config.js';
import { createTavernLauncher, inspectInstallation, probeTavern } from '../../plugins/sillytavern-bridge/lib/launcher.js';

async function fixture(t) { const dir = await mkdtemp(path.join(tmpdir(), 'tavern-bridge-fixture-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }
const configuration = () => ({ ...normalizeConfig(), tavernDirectory: path.resolve('synthetic-tavern') });
const childProcess = () => Object.assign(new EventEmitter(), { unref() {} });

test('safe defaults are portable and sharing requires explicit boolean consent', () => {
  const cfg = normalizeConfig(); assert.equal(cfg.tavernDirectory, ''); assert.equal(cfg.sharingEnabled, false);
  for (const value of [{ tavernPort: 80 }, { tavernPort: 8100 }, { gatewayPort: 70000 }, { sharingEnabled: 'true' }, { tavernDirectory: '../elsewhere' }, { nodeCommand: 'launch.bat' }, { sharedProviders: ['../private'] }]) assert.throws(() => normalizeConfig(value));
  assert.deepEqual(normalizeConfig({ sharedProviders: ['one', 'one'] }).sharedProviders, ['one']);
});
test('settings and generated gateway key persist only in a synthetic storage directory', async t => {
  const dir = await fixture(t), store = new ConfigStore(dir);
  assert.equal((await store.load()).sharingEnabled, false);
  await store.save({ ...configuration(), sharingEnabled: true }); assert.equal((await store.load()).sharingEnabled, true);
  const key = await store.gatewayKey(); assert.ok(/^[a-f0-9]{64}$/.test(key)); assert.ok(key === await store.gatewayKey());
  const saved = await readFile(store.configFile, 'utf8'); assert.ok(!saved.includes(key)); assert.ok(!saved.includes('apiKey'));
  await writeFile(store.keyFile, '{invalid'); await assert.rejects(store.gatewayKey(), /密钥文件损坏/);
});
test('corrupt stored settings fail closed instead of silently enabling defaults', async t => {
  const store = new ConfigStore(await fixture(t)); await writeFile(store.configFile, '{invalid'); await assert.rejects(store.load(), /配置无法读取/);
});
test('preinstalled SillyTavern plus dependencies are required; nothing is downloaded', async t => {
  const dir = await fixture(t); await assert.rejects(inspectInstallation(''), /先下载/); await assert.rejects(inspectInstallation(dir), /依赖不完整/);
  await writeFile(path.join(dir, 'server.js'), ''); await mkdir(path.join(dir, 'node_modules')); await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'sillytavern', version: 'synthetic' }));
  assert.deepEqual(await inspectInstallation(dir), { version: 'synthetic' });
});
test('probe identifies SillyTavern, refuses unknown pages and distinguishes timeouts from a free port', async () => {
  const url = localUrl(8000);
  assert.equal(await probeTavern(url, async () => new Response('<title>SillyTavern</title>')), 'ready');
  assert.equal(await probeTavern(url, async () => new Response('<title>Other</title>')), 'occupied');
  assert.equal(await probeTavern(url, async () => new Response('', { status: 401 })), 'occupied');
  assert.equal(await probeTavern(url, async () => { throw new Error('synthetic', { cause: { code: 'ECONNREFUSED' } }); }), 'absent');
  assert.equal(await probeTavern(url, async () => { throw new DOMException('synthetic', 'TimeoutError'); }), 'unknown');
});
test('ready service is reused without spawning', async () => {
  const launcher = createTavernLauncher({ inspect: async () => ({ version: 'test' }), probe: async () => 'ready', spawnProcess: () => { throw new Error('must not spawn'); } });
  const result = await launcher.ensureStarted(configuration()); assert.equal(result.reused, true);
});
test('simultaneous clicks create one hidden process, never shell or npm', async () => {
  let starts = 0, probes = 0;
  const launcher = createTavernLauncher({ inspect: async () => ({ version: 'test' }), probe: async () => ++probes > 1 ? 'ready' : 'absent', sleep: async () => {},
    spawnProcess(node, args, options) { starts++; assert.equal(node, 'node'); assert.deepEqual(args, ['server.js', '--no-browserLaunchEnabled', '--port', '8000']); assert.equal(options.shell, false); assert.equal(options.windowsHide, true); return childProcess(); } });
  const [a, b] = await Promise.all([launcher.ensureStarted(configuration()), launcher.ensureStarted(configuration())]);
  assert.equal(starts, 1); assert.deepEqual(a, b); assert.equal(launcher.busy, false);
});
test('occupied and ambiguous ports never spawn or stop another service', async () => {
  for (const state of ['occupied', 'unknown']) { const launcher = createTavernLauncher({ inspect: async () => ({}), probe: async () => state, spawnProcess: () => assert.fail('must not spawn') }); await assert.rejects(launcher.ensureStarted(configuration()), /不会覆盖/); }
});
test('timeout retains the live child handle; retry cannot launch a duplicate', async () => {
  let clock = 0, starts = 0; const child = childProcess();
  const launcher = createTavernLauncher({ inspect: async () => ({}), probe: async () => 'absent', now: () => clock, timeoutMs: 600, sleep: async () => { clock += 400; }, spawnProcess: () => { starts++; return child; } });
  await assert.rejects(launcher.ensureStarted(configuration()), /超时/); await assert.rejects(launcher.ensureStarted(configuration()), /尚未退出/); assert.equal(starts, 1);
  child.emit('exit', 1); await assert.rejects(launcher.ensureStarted(configuration()), /超时/); assert.equal(starts, 2);
});
test('Node launch errors and early exit are surfaced without emitting secret exception text', async () => {
  for (const failure of ['error', 'exit']) {
    const child = childProcess(); const launcher = createTavernLauncher({ inspect: async () => ({}), probe: async () => 'absent', spawnProcess: () => child, sleep: async () => { child.emit(failure, failure === 'error' ? new Error('synthetic-sensitive-value') : 1); } });
    await assert.rejects(launcher.ensureStarted(configuration()), error => !error.message.includes('synthetic-sensitive-value') && /Node|提前退出/.test(error.message));
  }
});
