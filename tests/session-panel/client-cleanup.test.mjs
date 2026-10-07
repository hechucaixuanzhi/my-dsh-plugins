import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual client module's effect cleanup, without a host, model
// request, real Session, or browser storage. In particular, unmount while
// /state or sessions.refresh() is still pending, as in the native crash.
const source = fs.readFileSync(new URL('../../plugins/session-panel/lib/client.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ pendingRefresh = false, directoryFailure = false, visible = true } = {}) {
  const stateRequest = deferred(), refresh = deferred(), hooks = [], releases = [];
  const originalRemote = { session: { original: true } };
  const originalModels = { original: true }, directory = { sessions: originalModels };
  const session = { sessionId: 'side', remote: originalRemote };
  const stats = { refreshed: 0, acquired: 0, retained: 0, released: 0 };
  let module, SidePanel;
  const React = {
    createElement: (...args) => args,
    useState: initial => [initial, () => {}],
    useEffect: effect => { hooks.push(effect); },
  };
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: value => { module = value; } } },
    AbortController, TextDecoder, Blob, Uint8Array, URL,
    fetch: (_url, { signal }) => {
      signal?.addEventListener('abort', () => stateRequest.reject(new Error('aborted')), { once: true });
      return stateRequest.promise;
    },
  });
  const ctx = {
    effect(fn, name) {
      // Styling is irrelevant to effect ownership, and must not touch a DOM.
      if (!name.includes('layout only')) releases.push(fn());
    },
    commandUi: { directory: { fetchCommands() {}, resetSession() {} }, execute() {}, notifyExecuted() {} },
    fileUpload: { upload() {} },
    sidebarRightTabs: { register: () => () => {} },
    slots: {
      inject: (_name, fn) => fn(),
      register(info, component) {
        if (info.key === '@dsh-local/session-panel') SidePanel = component;
        return () => {};
      },
    },
    sessions: {
      refresh() { stats.refreshed++; return pendingRefresh ? refresh.promise : Promise.resolve(); },
      manager: { get() { stats.acquired++; return session; } },
      retain() { stats.retained++; return { sessionId: 'side', ready: Promise.resolve(), release() { stats.released++; } }; },
    },
    modelDirectories: { directoryFor() { if (directoryFailure) throw new Error('directory unavailable'); return directory; } },
  };
  module.factory(name => {
    if (name === 'react') return React;
    assert.equal(name, '@deepseek-ai/dsh-api-gateway/client');
    return { RemoteStreamCarrierError: class extends Error {} };
  }).apply(ctx);
  SidePanel({ sessionId: 'main', useTabInfo: () => ({ tab: { visible } }) });
  assert.equal(hooks.length, 3);
  const cleanup = hooks[1]();
  return {
    cleanup, ctx, session, directory, originalRemote, originalModels, stats,
    resolveState: () => stateRequest.resolve({ ok: true, json: async () => ({ ok: true, value: { sideSessionId: 'side' } }) }),
    rejectState: () => stateRequest.reject(new Error('connection failed')),
    resolveRefresh: () => refresh.resolve(),
    disposeModule: () => { for (const release of releases) release?.(); },
  };
}

test('closing before state resolves does not crash the parent right sidebar', async () => {
  const f = fixture();
  assert.doesNotThrow(f.cleanup);
  await tick();
  assert.equal(f.stats.acquired, 0);
  assert.equal(f.stats.retained, 0);
  f.disposeModule();
});

test('closing after a connection failure does not dereference missing resources', async () => {
  const f = fixture();
  f.rejectState();
  await tick();
  assert.doesNotThrow(f.cleanup);
  assert.equal(f.session.remote, f.originalRemote);
  f.disposeModule();
});

test('switching main sessions during refresh cannot crash or acquire a late Session', async () => {
  const f = fixture({ pendingRefresh: true });
  f.resolveState();
  await tick();
  assert.equal(f.stats.refreshed, 1);
  assert.doesNotThrow(f.cleanup);
  f.resolveRefresh();
  await tick();
  assert.equal(f.stats.acquired, 0);
  assert.equal(f.session.remote, f.originalRemote);
  f.disposeModule();
});

test('partial setup failure restores only resources that were acquired', async () => {
  const f = fixture({ directoryFailure: true });
  f.resolveState();
  await tick();
  assert.notEqual(f.session.remote, f.originalRemote);
  assert.doesNotThrow(f.cleanup);
  assert.equal(f.session.remote, f.originalRemote);
  assert.equal(f.directory.sessions, f.originalModels);
  assert.equal(f.stats.released, 1);
  f.disposeModule();
});

test('completed setup restores the original transports on cleanup', async () => {
  const f = fixture();
  f.resolveState();
  await tick();
  assert.notEqual(f.session.remote, f.originalRemote);
  assert.notEqual(f.directory.sessions, f.originalModels);
  assert.doesNotThrow(f.cleanup);
  assert.equal(f.session.remote, f.originalRemote);
  assert.equal(f.directory.sessions, f.originalModels);
  assert.equal(f.stats.released, 1);
  f.disposeModule();
});

test('cleanup does not overwrite a newer owner of either transport', async () => {
  const f = fixture();
  f.resolveState();
  await tick();
  const newRemote = { session: {} }, newModels = {};
  f.session.remote = newRemote;
  f.directory.sessions = newModels;
  assert.doesNotThrow(f.cleanup);
  assert.equal(f.session.remote, newRemote);
  assert.equal(f.directory.sessions, newModels);
  f.disposeModule();
});

test('a never-activated tab does not acquire resources or register cleanup', () => {
  const f = fixture({ visible: false });
  assert.equal(f.cleanup, undefined);
  assert.equal(f.stats.refreshed, 0);
  f.disposeModule();
});
