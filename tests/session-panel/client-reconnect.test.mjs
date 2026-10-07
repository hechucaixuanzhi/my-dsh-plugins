import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

if (!process.env.DSH_ASAR) {
  test('official installed-state-machine recovery suite', { skip: 'Set DSH_ASAR to run against an installed DSH archive; this is NOT a pass' }, () => {});
} else {
// No Host, model calls, authentication, real sessions or browser storage.
// Load the installed official state machines, rather than imitating recovery.
function asarRead(path) {
  const fd = fs.openSync(process.env.DSH_ASAR, 'r');
  try {
    const prefix = Buffer.alloc(16); fs.readSync(fd, prefix, 0, 16, 0);
    const header = Buffer.alloc(prefix.readUInt32LE(12)); fs.readSync(fd, header, 0, header.length, 16);
    let entry = JSON.parse(header.toString());
    for (const part of path.split('/')) entry = entry.files[part];
    const data = Buffer.alloc(entry.size);
    fs.readSync(fd, data, 0, data.length, 8 + prefix.readUInt32LE(4) + Number(entry.offset));
    return data.toString();
  } finally { fs.closeSync(fd); }
}
function load(source, require, globals = {}) {
  let definition;
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: value => { definition = value; } } },
    AbortController, AbortSignal, TextDecoder, TextEncoder, console, setTimeout, clearTimeout, queueMicrotask, ...globals });
  return definition.factory(require);
}
const gateway = load(asarRead('dsh/node_modules/@deepseek-ai/dsh-api-gateway/lib/client.js'), () => ({ Service: class {} }));
const official = load(asarRead('dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js'),
  name => name === '@deepseek-ai/dsh-api-gateway/client' ? gateway : { Service: class {} });
const source = fs.readFileSync(new URL('../../plugins/session-panel/lib/client.js', import.meta.url), 'utf8');
const instrumented = source.replace('return { apply: apply, inject:', 'return { probe: sideRemote, makePanel: makeSidePanel, apply: apply, inject:');
const tick = () => new Promise(resolve => setTimeout(resolve, 2));
async function until(predicate) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await tick(); }
  assert.fail('Timed out waiting for the isolated stream');
}
const event = (seq, text) => ({ event: { type: 'assistant/message', seq, time: seq,
  data: { message: { role: 'assistant', content: [{ type: 'text', text }] } }, surfaceOp: 'append' } });
const snapshot = records => ({ type: 'snapshot', cursor: records.at(-1)?.event.seq ?? -1,
  records, hasMore: false, projections: {}, assistantStream: { revision: 0, streams: [] } });

function carrier(signal) {
  const queue = []; let waiting, cancelled = 0, released = 0;
  const drain = () => { if (waiting && queue.length) { const task = waiting; waiting = undefined; const item = queue.shift(); item.error ? task.reject(item.error) : task.resolve(item); } };
  const abort = () => { queue.unshift({ error: signal.reason }); drain(); };
  signal?.addEventListener('abort', abort, { once: true });
  const reader = {
    read() { return new Promise((resolve, reject) => { waiting = { resolve, reject }; drain(); }); },
    async cancel() { cancelled++; signal?.removeEventListener('abort', abort); queue.push({ done: true }); drain(); },
    releaseLock() { released++; },
  };
  return {
    response: { ok: true, headers: { get: () => 'application/x-ndjson' }, body: { getReader: () => reader } },
    bytes(value) { queue.push({ done: false, value }); drain(); },
    frame(value) { this.bytes(new TextEncoder().encode(JSON.stringify(value) + '\n')); },
    fail() { queue.push({ error: new TypeError('Failed to fetch') }); drain(); },
    end() { queue.push({ done: true }); drain(); },
    get cancelled() { return cancelled; }, get released() { return released; },
  };
}
function fixture(handler, ids = { main: 'main-A', side: 'side-A' }) {
  const requests = [], statuses = [], delays = [], streams = [], failures = [], changes = [];
  const connection = { generation: { getSnapshot: () => 1 } };
  const original = { session: { untouched: true }, $stream: options => new gateway.RemoteStream(connection, options) };
  const client = load(instrumented, name => name === 'react' ? {} : gateway, {
    setTimeout(fn, ms) { delays.push(ms); return setTimeout(fn, 1); }, clearTimeout,
    fetch: async (url, init) => {
      const body = JSON.parse(init.body); requests.push({ url, body });
      assert.equal(url, '/api/session-panel/native'); assert.equal(body.mainSessionId, ids.main);
      assert.equal(body.operation, 'follow'); assert.equal(body.request.address.sessionId, ids.side);
      const make = () => { const value = carrier(init.signal); streams.push(value); return value; };
      return handler({ count: requests.length, make, signal: init.signal });
    },
  });
  const remote = client.probe(original, ids.main, ids.side, value => statuses.push(value));
  let entries = [];
  const journal = new official.SessionEventStream(remote, { sessionId: ids.side }, {
    publish(change) { changes.push(change); if (change.type === 'replace') entries = [...change.entries];
      if (change.type === 'append') entries.push(change.entry); },
    failed(error) { failures.push(error); },
  });
  return { remote, original, journal, requests, statuses, delays, streams, failures, changes, get entries() { return entries; } };
}

test('physical read failure is classified as an official retryable carrier error', async () => {
  const f = fixture(({ make }) => { const stream = make(); stream.fail(); return stream.response; });
  const signal = new AbortController();
  await assert.rejects(f.remote.session.follow({ address: { sessionId: 'side-A' } }, signal.signal).next(),
    error => error instanceof gateway.RemoteStreamCarrierError);
  assert.equal(f.streams[0].cancelled, 1); assert.equal(f.streams[0].released, 1);
});

test('official journal reconnects, catches missed replies, deduplicates and survives a second disconnect', async () => {
  const first = event(0, 'before'), missed = event(1, 'SIDE-A'), later = event(2, 'after');
  const f = fixture(({ count, make }) => { const stream = make();
    stream.frame(snapshot(count === 1 ? [first] : count === 2 ? [first, missed] : [first, missed, later]));
    if (count === 2) stream.frame({ type: 'event', ...missed }); // duplicated durable delivery
    return stream.response; });
  await f.journal.open({ maxMessages: 50 });
  assert.equal(f.entries.length, 1); f.streams[0].fail();
  await until(() => f.entries.length === 2 || f.failures.length);
  assert.equal(f.failures.length, 0); assert.equal(f.entries[1].event.data.message.content[0].text, 'SIDE-A');
  f.streams[1].fail(); await until(() => f.entries.length === 3 || f.failures.length);
  assert.equal(f.failures.length, 0); assert.deepEqual(f.entries.map(x => x.event.seq), [0, 1, 2]);
  assert.equal(f.requests.length, 3); assert.ok(f.delays.length >= 2, 'backoff prevents immediate retry loops');
  assert.ok(f.statuses.some(x => x.phase === 'reconnecting')); assert.equal(f.statuses.at(-1).phase, 'connected');
  await f.journal.dispose(); assert.equal(f.original.session.untouched, true);
});

test('initial failed fetch recovers before the first baseline without resending a prompt', async () => {
  const f = fixture(({ count, make }) => { if (count === 1) throw new TypeError('Failed to fetch');
    const stream = make(); stream.frame(snapshot([event(0, 'recovered')])); return stream.response; });
  await f.journal.open({ maxMessages: 50 });
  assert.equal(f.entries.length, 1); assert.equal(f.failures.length, 0);
  assert.equal(f.statuses.at(-1).phase, 'connected'); assert.equal(f.requests.length, 2);
  await f.journal.dispose();
});

test('persistent opening failures are bounded and reported, not retried in a busy loop', async () => {
  const f = fixture(() => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(f.journal.open({ maxMessages: 50 }));
  assert.equal(f.requests.length, 3); assert.equal(f.delays.length, 2);
  assert.equal(f.statuses.at(-1).phase, 'error');
});

test('transient HTTP failure recovers; authentication, scope and malformed NDJSON fail closed', async t => {
  await t.test('503 followed by a valid baseline', async () => {
    const f = fixture(({ count, make }) => { if (count === 1) return { ok: false, status: 503 };
      const stream = make(); stream.frame(snapshot([])); return stream.response; });
    await f.journal.open({}); assert.equal(f.requests.length, 2); await f.journal.dispose();
  });
  for (const status of [401, 403, 404]) await t.test(String(status), async () => {
    const f = fixture(() => ({ ok: false, status }));
    await assert.rejects(f.journal.open({})); assert.equal(f.requests.length, 1);
    assert.equal(f.statuses.at(-1).phase, 'error');
  });
  await t.test('backend side-error is not a network retry', async () => {
    const f = fixture(({ make }) => { const stream = make(); stream.frame({ type: 'side-error', message: 'scope denied' }); return stream.response; });
    await assert.rejects(f.journal.open({})); assert.equal(f.requests.length, 1); assert.equal(f.statuses.at(-1).phase, 'error');
  });
  await t.test('malformed complete line is terminal', async () => {
    const f = fixture(({ make }) => { const stream = make(); stream.bytes(new TextEncoder().encode('{bad}\n')); return stream.response; });
    await assert.rejects(f.journal.open({})); assert.equal(f.requests.length, 1); assert.equal(f.statuses.at(-1).phase, 'error');
  });
});

test('clean or truncated physical EOF before a baseline is retried', async t => {
  for (const truncated of [false, true]) await t.test(String(truncated), async () => {
    const f = fixture(({ count, make }) => { const stream = make();
      if (count === 1) { if (truncated) stream.bytes(new TextEncoder().encode('{"type":"snapshot"')); stream.end(); }
      else stream.frame(snapshot([event(0, 'caught up')])); return stream.response; });
    await f.journal.open({}); assert.equal(f.entries.length, 1); assert.equal(f.requests.length, 2); await f.journal.dispose();
  });
});

test('split NDJSON and split multibyte text preserve output exactly', async () => {
  const f = fixture(({ make }) => { const stream = make(), bytes = new TextEncoder().encode(JSON.stringify(snapshot([event(0, '中文🐳')])) + '\n');
    for (const byte of bytes) stream.bytes(Uint8Array.of(byte)); return stream.response; });
  await f.journal.open({}); assert.equal(f.entries[0].event.data.message.content[0].text, '中文🐳'); await f.journal.dispose();
});

test('explicit abort releases the reader without retrying or emitting a late warning', async () => {
  const f = fixture(({ make }) => { const stream = make(); stream.frame(snapshot([])); return stream.response; });
  await f.journal.open({}); const attempts = f.requests.length, notices = f.statuses.length;
  await f.journal.dispose(); await tick();
  assert.equal(f.requests.length, attempts); assert.equal(f.statuses.length, notices);
  assert.equal(f.streams[0].cancelled, 1); assert.equal(f.streams[0].released, 1); assert.equal(f.failures.length, 0);
});

test('two side transports never share recovery state, requests or records', async () => {
  const a = fixture(({ make }) => { const stream = make(); stream.frame(snapshot([event(0, 'A')])); return stream.response; });
  const b = fixture(({ make }) => { const stream = make(); stream.frame(snapshot([event(0, 'B')])); return stream.response; }, { main: 'main-B', side: 'side-B' });
  await Promise.all([a.journal.open({}), b.journal.open({})]); a.streams[0].fail(); await until(() => a.requests.length === 2 || a.failures.length);
  assert.equal(a.failures.length, 0); assert.equal(b.requests.length, 1); assert.equal(b.entries[0].event.data.message.content[0].text, 'B');
  await Promise.all([a.journal.dispose(), b.journal.dispose()]);
});

}
