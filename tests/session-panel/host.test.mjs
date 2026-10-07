import test from 'node:test';
import assert from 'node:assert/strict';
import { SideRegistry, readMainHistory, activityOf, stepsOf, apply } from '../../plugins/session-panel/lib/index.js';

function mainFixture() {
  const records = [
    { seq: 0, time: 0, type: 'user/message', data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'synthetic {{user}} / {{char}} request' }] } },
    { seq: 1, time: 1, type: 'turn/start', data: { turn: 1 } },
    { seq: 2, time: 2, type: 'step/start', data: { step: 1 } },
    { seq: 3, time: 3, type: 'assistant/message', data: { step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'checking' }, { type: 'tool-call', id: 'call-a', name: 'read' }] } } },
    { seq: 4, time: 4, type: 'tool/call', data: { callId: 'call-a', arguments: { path: 'synthetic-file' } } },
    { seq: 5, time: 5, type: 'tool/result', data: { message: { role: 'tool', source: { callId: 'call-a' }, content: [{ type: 'text', text: 'fixture result' }] } } },
    { seq: 6, time: 6, type: 'step/end', data: { step: 1 } },
    { seq: 7, time: 7, type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  ];
  const session = { id: 'main-fixture', header: {}, snapshotEvents: () => records };
  const ctx = { agents: { get: () => undefined } };
  return { records, session, ctx };
}

test('per-main side identity is stable and isolated, without installation-specific constants', async () => {
  const a = new SideRegistry({}), b = new SideRegistry({});
  assert.equal(a.forMain('main-A').sideSessionId, b.forMain('main-A').sideSessionId);
  assert.notEqual(a.forMain('main-A').sideSessionId, a.forMain('main-B').sideSessionId);
  assert.throws(() => a.forMain('')); assert.throws(() => a.forMain(a.forMain('main-A').sideSessionId));
  await Promise.all([a.dispose(), b.dispose()]);
});

test('metadata rejects live and persisted side conversations as mains after removing the private singleton guard', async () => {
  const header = { origin: 'subagent' };
  const live = new SideRegistry({ sessions: { get: () => ({ header }) } });
  await assert.rejects(live.forMain('synthetic-hidden').readMain(), /正式主对话/);
  const persisted = new SideRegistry({ sessions: { get: () => undefined }, sessionPersistence: { stat: async () => ({ header }) } });
  await assert.rejects(persisted.forMain('synthetic-persisted-hidden').readMain(), /正式主对话/);
});

test('main observation is read-only and preserves literal template text', () => {
  const { session, records, ctx } = mainFixture(), before = JSON.stringify(records);
  const result = readMainHistory(session, ctx, { mode: 'messages' });
  assert.ok(result.rows[0].preview.includes('{{user}} / {{char}}'));
  readMainHistory(session, ctx, { mode: 'trajectory' }); readMainHistory(session, ctx, { mode: 'events' });
  assert.equal(JSON.stringify(records), before);
});

test('invalid selectors and bounds fail closed; chunked results are recoverable', () => {
  const { session, records, ctx } = mainFixture();
  for (const args of [{ sessionId: 'other' }, { mode: 'other' }, { limit: 31 }, { offset: -1 }, { snapshot_seq: -2 }, { mode: 'event' }]) assert.throws(() => readMainHistory(session, ctx, args));
  records[5].data.message.content[0].text = 'synthetic-'.repeat(2200);
  let offset = 0, merged = '';
  do { const part = readMainHistory(session, ctx, { mode: 'event', seq: 5, offset }); merged += part.chunk; offset = part.next_offset; } while (offset !== null);
  assert.deepEqual(JSON.parse(merged), records[5]);
});

test('fixed snapshot pagination excludes future entries; a fresh snapshot sees them', () => {
  const { session, records, ctx } = mainFixture();
  const first = readMainHistory(session, ctx, { mode: 'events', limit: 3 });
  records.push({ seq: 8, time: 8, type: 'step/start', data: { step: 2 } });
  const pinned = readMainHistory(session, ctx, { mode: 'events', snapshot_seq: first.snapshot_seq, after_seq: first.next_after_seq });
  assert.equal(pinned.snapshot_seq, 7); assert.ok(pinned.rows.every(row => row.seq <= 7));
  assert.equal(readMainHistory(session, ctx, { mode: 'status' }).snapshot_seq, 8);
});

test('completed turns clear orphaned tool activity and ended steps', () => {
  const { session, ctx, records } = mainFixture(); records.splice(5, 1);
  assert.equal(activityOf(ctx, session).running, false); assert.deepEqual(activityOf(ctx, session).tools, []);
  assert.ok(stepsOf(session).every(row => row.running === false));
});

test('native cancel targets only its bound side Agent; mismatched targets are rejected', async () => {
  let mainStops = 0, sideStops = 0;
  const main = { id: 'main-A', status: 'running', session: { id: 'main-A', header: {}, snapshotEvents: () => [] }, cancel() { mainStops++; } };
  let side;
  const ctx = { sessions: { get: id => id === main.id ? main.session : undefined },
    agents: { get: id => id === main.id ? main : id === side?.id ? side : undefined },
    get: name => name === 'sessionController' ? { history: { follow() {} }, commands: { prompt() {} }, agents: {} } : undefined };
  const registry = new SideRegistry(ctx), runtime = registry.forMain(main.id);
  side = { id: runtime.sideSessionId, cancel() { sideStops++; } }; runtime.handle = { agent: side };
  await assert.rejects(runtime.native('cancel', { sessionId: main.id }, new AbortController().signal), /不匹配/);
  await runtime.native('cancel', { sessionId: side.id }, new AbortController().signal);
  assert.equal(sideStops, 1); assert.equal(mainStops, 0); assert.equal(main.status, 'running');
});

test('plugin registers only its exact POST routes and rejects a wrong content type before decoding', async () => {
  const routes = [], ctx = { effect: fn => fn(), connection: { fetch: { register(route) { routes.push(route); return () => {}; } } } };
  apply(ctx);
  assert.ok(routes.length > 0); assert.ok(routes.every(route => route.path.startsWith('/api/session-panel/') && route.methods.join() === 'POST'));
  const state = routes.find(route => route.path.endsWith('/state'));
  const result = await state.fetch(new Request('https://example.invalid/api/session-panel/state', { method: 'POST', body: 'not JSON' }));
  assert.equal(result.status, 415);
});
