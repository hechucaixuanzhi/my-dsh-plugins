import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createRuntime, apply, inject } from '../../plugins/sillytavern-bridge/lib/index.js';
import { normalizeConfig, localUrl } from '../../plugins/sillytavern-bridge/lib/config.js';

function runtimeFixture(extra = {}) {
  let config = normalizeConfig(), reads = 0, launches = 0, started = 0, closed = 0, modelRequests = 0;
  const key = randomBytes(32).toString('hex');
  const store = { load: async () => config, save: async value => { config = value; }, gatewayKey: async () => { reads++; return key; } };
  const runtime = createRuntime({ llm: {}, store, inspect: async () => ({ version: '1.19.0' }), installExtension: async () => {}, launcher: { ensureStarted: async () => { launches++; return { status: 'ready', url: localUrl(8000) }; } },
    gatewayFactory: () => ({ get activeRequests() { return modelRequests; }, issueHandoff: () => 'synthetic-handoff', start: async () => { started++; }, close: async () => { closed++; } }), ...extra });
  return { runtime, key, set config(v) { config = normalizeConfig(v); }, set modelRequests(v) { modelRequests = v; }, get counts() { return { reads, launches, started, closed }; } };
}

test('disabled sharing does not create a key or start a gateway', async () => {
  const f = runtimeFixture(); await f.runtime.ensureStarted(); assert.deepEqual(f.counts, { reads: 0, launches: 1, started: 0, closed: 0 });
  await assert.rejects(f.runtime.gatewayKey(), /明确开启/); const state = await f.runtime.state(); assert.equal(state.gatewayRunning, false); assert.ok(!JSON.stringify(state).includes(f.key)); await f.runtime.dispose();
});
test('enabled sharing starts one gateway; state never contains its key', async () => {
  const f = runtimeFixture(); f.config = { sharingEnabled: true };
  await Promise.all([f.runtime.ensureStarted(), f.runtime.ensureStarted()]); assert.deepEqual(f.counts, { reads: 1, launches: 1, started: 1, closed: 0 });
  const state = await f.runtime.state(); assert.equal(state.gatewayRunning, true); assert.ok(!JSON.stringify(state).includes(f.key));
  assert.ok((await f.runtime.gatewayKey()).key === f.key); await f.runtime.dispose(); assert.equal(f.counts.closed, 1);
});
test('failed gateway startup is closed and never silently adopts an existing unauthenticated gateway', async () => {
  let closed = 0; const f = runtimeFixture({ gatewayFactory: () => ({ start: async () => { throw new Error('port occupied'); }, close: async () => { closed++; } }) }); f.config = { sharingEnabled: true };
  await assert.rejects(f.runtime.ensureStarted(), /port occupied/); assert.equal(closed, 1); assert.equal((await f.runtime.state()).gatewayRunning, false); await f.runtime.dispose();
});
test('configuration changes wait for active chats and close only the owned gateway', async () => {
  const f = runtimeFixture(); f.config = { sharingEnabled: true }; await f.runtime.ensureStarted(); f.modelRequests = 1;
  await assert.rejects(f.runtime.save(normalizeConfig()), /模型请求结束/); assert.equal(f.counts.closed, 0);
  f.modelRequests = 0; await f.runtime.save(normalizeConfig()); assert.equal(f.counts.closed, 1); assert.equal((await f.runtime.state()).config.sharingEnabled, false); await f.runtime.dispose();
});
test('disabling during a delayed Tavern launch cannot create a late gateway', async () => {
  let finish; const waiting = new Promise(r => { finish = r; }); const f = runtimeFixture({ launcher: { ensureStarted: () => waiting } }); f.config = { sharingEnabled: true };
  const pending = f.runtime.ensureStarted(); await new Promise(r => setImmediate(r)); await f.runtime.dispose(); finish({ status: 'ready' }); await assert.rejects(pending, /已停用/); assert.equal(f.counts.started, 0);
});
test('Host routes use only authenticated DSH Connection and bounded JSON, never generic file or credential access', async () => {
  const routes = [], cleanups = []; apply({ llm: {}, connection: { fetch: { register(route) { routes.push(route); return () => {}; } } }, effect(fn, label) { const cleanup = fn(); if (label.endsWith('lifecycle')) cleanups.push(cleanup); } });
  assert.deepEqual(inject, ['connection', 'llm']); assert.equal(routes.length, 5);
  assert.ok(routes.every(route => route.methods.join() === 'POST' && route.path.startsWith('/api/sillytavern-bridge/')));
  for (const route of routes) {
    const result = await route.fetch(new Request('https://example.invalid' + route.path, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'not JSON' })); assert.equal(result.status, 415);
    const malformed = await route.fetch(new Request('https://example.invalid' + route.path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })); assert.equal(malformed.status, 400);
  }
  const guide = routes.find(r => r.path.endsWith('/workspace-guide'));
  const result = await guide.fetch(new Request('https://example.invalid' + guide.path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"language":"en"}' }));
  // This route reads only a fixed, packaged guide, never user-controlled paths.
  assert.equal(result.status, 200); assert.ok((await result.json()).text.includes('authorization'));
  await Promise.all(cleanups.map(fn => fn()));
});

const source = await readFile(new URL('../../plugins/sillytavern-bridge/lib/client.js', import.meta.url), 'utf8');
function clientFixture(protocol = 'dsh-app:') {
  let registration, component, effect, definition, settings;
  const refs = [], requests = [], opened = [], setters = [];
  let refIndex = 0;
  const react = { Fragment: 'fragment', createElement: (...args) => args, useState: value => [value, next => setters.push(next)], useRef(value) { return refs[refIndex++] ||= { current: value }; }, useEffect: fn => { effect = fn; } };
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: value => { registration = value; } } }, location: { protocol }, AbortController, URL, navigator: { clipboard: { writeText: async () => {} } },
    fetch(url, options) { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); requests.push({ url, options, resolve, reject }); return promise; } });
  const plugin = registration.factory(() => react);
  plugin.apply({ effect: fn => fn(), sidebarRightTabs: { register: value => { definition = value; } }, slots: { inject: (_name, fn) => fn(), register: (spec, value) => { if (spec.name === 'settings.section') settings = spec; else component = value; } } });
  const mount = () => { refIndex = 0; const tree = component({ useTabInfo: () => ({ tab: { actions: { openTab: (...args) => opened.push(args) } } }) }); return { tree, cleanup: effect() }; };
  return { mount, requests, opened, settings, definition, setters };
}
const ready = url => ({ ok: true, json: async () => ({ status: 'ready', url }) });

test('client registers separate Tavern and settings entries, waiting for readiness', async () => {
  const f = clientFixture(); const mounted = f.mount(); assert.equal(f.definition.kind, 'sillytavern'); assert.equal(f.settings.label, 'DSH 酒馆桥'); assert.equal(f.requests.length, 1); assert.equal(f.opened.length, 0);
  assert.equal(f.requests[0].options.headers['Content-Type'], 'application/json'); f.requests[0].resolve(ready(localUrl(8000))); await new Promise(r => setImmediate(r));
  assert.equal(f.opened[0][0], 'browser'); assert.equal(f.opened[0][1].replaceTab, true); mounted.cleanup();
});
test('closing before readiness aborts the fetch and never opens a late tab', async () => {
  const f = clientFixture(); const { cleanup } = f.mount(); cleanup(); assert.equal(f.requests[0].options.signal.aborted, true);
  f.requests[0].resolve(ready(localUrl(8000))); await new Promise(r => setImmediate(r)); assert.equal(f.opened.length, 0);
});
test('re-rendered tab actions cannot let an old response open the wrong tab', async () => {
  const f = clientFixture(); const first = f.mount(); first.cleanup(); const second = f.mount();
  f.requests[0].resolve(ready(localUrl(8000))); await new Promise(r => setImmediate(r)); assert.equal(f.opened.length, 0);
  f.requests[1].resolve(ready(localUrl(8001))); await new Promise(r => setImmediate(r)); assert.equal(f.opened.length, 1); assert.equal(f.opened[0][1].params.url, localUrl(8001)); second.cleanup();
});
test('Web cannot accidentally open its own loopback or start a Desktop-only workflow', () => {
  const f = clientFixture('https:'); const mounted = f.mount(); assert.equal(f.requests.length, 0); assert.ok(f.setters.some(v => typeof v === 'string' && v.includes('桌面版'))); mounted.cleanup();
});
test('unexpected remote URLs and startup failures remain visible errors, not browser tabs', async () => {
  for (const response of [ready('https://example.invalid/'), { ok: false, json: async () => ({ error: 'synthetic startup error' }) }]) {
    const f = clientFixture(); const mounted = f.mount(); f.requests[0].resolve(response); await new Promise(r => setImmediate(r)); assert.equal(f.opened.length, 0); assert.ok(f.setters.some(v => typeof v === 'string' && /URL|startup/.test(v))); mounted.cleanup();
  }
});
