import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual panel, effects and callbacks with isolated hook state.
// These are component-contract tests, NOT native Desktop acceptance.
const source = fs.readFileSync(new URL('../../plugins/session-panel/lib/client.js', import.meta.url), 'utf8')
  .replace('return { apply: apply, inject:', 'return { makePanel: makeSidePanel, apply: apply, inject:');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ pendingResync = false } = {}) {
  let definition, cursor = 0, state = [], effects = [], listeners = new Set(), snapshot = { openState: 'open' }, tree;
  const writes = [], streams = [], stats = { retained: 0, released: 0, resync: 0, mainResync: 0, draftWrites: 0 };
  const draft = Object.freeze({ text: 'A 未发送草稿', image: 'synthetic-image' });
  const view = { type: 'official-conversation', draft };
  let rejectResync;
  const resyncWait = new Promise((_yes, no) => { rejectResync = no; }); resyncWait.catch(() => {});
  const originalRemote = { session: {} };
  const session = { sessionId: 'side-A', remote: originalRemote, getSnapshot: () => snapshot,
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    async resync() {
      stats.resync++;
      if (pendingResync) return resyncWait;
      const controller = new AbortController(); streams.push(controller);
      const follower = session.remote.session.follow({ address: { sessionId: 'side-A' } }, controller.signal);
      await follower.next(); follower.next().catch(() => {});
    },
  };
  const ctx = {
    sessions: { refresh: async () => {}, manager: { get: () => session },
      retain() { stats.retained++; return { sessionId: 'side-A', ready: Promise.resolve(), release() { stats.released++; } }; } },
    modelDirectories: { directoryFor: () => ({ sessions: originalRemote.session }) },
  };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; writes.push({ index, value }); }]; },
    useEffect(callback) { effects.push(callback); },
  };
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: value => { definition = value; } } },
    AbortController, TextDecoder, Blob, Uint8Array, URL, setTimeout, clearTimeout,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body); assert.equal(body.mainSessionId, 'main-A');
      if (url.endsWith('/state')) return { ok: true, json: async () => ({ ok: true, value: { sideSessionId: 'side-A' } }) };
      assert.equal(body.operation, 'follow'); assert.equal(body.request.address.sessionId, 'side-A');
      let reads = 0;
      return { ok: true, headers: { get: () => 'application/x-ndjson' }, body: { getReader: () => ({
        async read() {
          if (reads++ === 0) return { done: false, value: new TextEncoder().encode('{"type":"snapshot"}\n') };
          return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }));
        }, cancel: async () => {}, releaseLock() {},
      }) } };
    },
  });
  const Panel = definition.factory(name => name === 'react' ? React : { RemoteStreamCarrierError: class extends Error {} })
    .makePanel(ctx, { bind: () => () => {} });
  function render() {
    cursor = 0; effects = [];
    tree = Panel({ sessionId: 'main-A', useTabInfo: () => ({ tab: { visible: true } }), SessionProvider: 'official-provider', renderSlot: () => view });
    return tree;
  }
  render(); const cleanup = effects[1]();
  function nodes(root = tree) { return [root, ...(root?.children || []).flatMap(child => typeof child === 'object' && child ? nodes(child) : [])]; }
  function failure(message = 'stream unavailable') { snapshot = { openState: 'error', openError: new Error(message) }; for (const callback of listeners) callback(); render(); }
  return { stats, draft, view, session, originalRemote, writes, render, nodes, failure, rejectResync,
    async ready() { await tick(); render(); },
    cleanup() { cleanup(); for (const controller of streams) controller.abort(); },
    button() { return nodes().find(node => node.type === 'button' && node.children.includes('重新连接')); },
    notice() { return nodes().find(node => node.props?.className === 'sp-connection'); },
    get listenerCount() { return listeners.size; },
  };
}

test('terminal observer failure shows a retry action while retaining the official conversation and draft', async () => {
  const f = fixture(); await f.ready(); f.failure();
  assert.equal(f.notice().props.role, 'alert'); assert.ok(f.button());
  assert.ok(f.nodes().includes(f.view)); assert.equal(f.draft.text, 'A 未发送草稿');
  assert.equal(f.stats.retained, 1); assert.equal(f.stats.released, 0);
  f.cleanup(); assert.equal(f.listenerCount, 0);
});

test('manual reconnect resyncs only the side Session, hides notice after a new baseline and preserves the mounted view', async () => {
  const f = fixture(); await f.ready(); f.failure();
  await f.button().props.onClick(); await tick(); f.render();
  assert.equal(f.stats.resync, 1); assert.equal(f.stats.mainResync, 0); assert.equal(f.stats.retained, 1);
  assert.equal(f.notice(), undefined); assert.ok(f.nodes().includes(f.view));
  assert.equal(f.stats.draftWrites, 0); assert.equal(f.stats.released, 0); f.cleanup();
});

test('double click cannot duplicate resync; a late rejection after closing cannot update panel state', async () => {
  const f = fixture({ pendingResync: true }); await f.ready(); f.failure();
  const click = f.button().props.onClick, first = click(); await click();
  assert.equal(f.stats.resync, 1); f.render(); assert.equal(f.notice().props.role, 'status');
  f.cleanup(); const count = f.writes.length; f.rejectResync(new Error('late failure')); await first; await tick();
  assert.equal(f.writes.length, count); assert.equal(f.session.remote, f.originalRemote);
});

test('an old panel retry callback is inert after closing or losing transport ownership', async () => {
  const f = fixture(); await f.ready(); f.failure(); const click = f.button().props.onClick;
  f.session.remote = { session: {} }; await click(); assert.equal(f.stats.resync, 0);
  f.cleanup(); await click(); assert.equal(f.stats.resync, 0);
});
