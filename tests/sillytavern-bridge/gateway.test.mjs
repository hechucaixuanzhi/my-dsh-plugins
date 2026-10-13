import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { createGateway, toDshRequest } from '../../plugins/sillytavern-bridge/lib/gateway.js';
import { localUrl } from '../../plugins/sillytavern-bridge/lib/config.js';

function fakeLlm(events, tracker = {}) {
  return { listProviders: () => [{ id: 'demo', name: 'Demo' }], listModels: async () => [{ id: 'text', provider: 'demo', name: 'Text' }],
    async *stream(options) { tracker.options = options; tracker.calls = (tracker.calls || 0) + 1; for (const event of events || [{ type: 'text-delta', index: 0, text: 'Hello 世界' }, { type: 'usage', usage: { inputTokens: 2, cacheReadTokens: 3, outputTokens: 4 } }, { type: 'finish', reason: { kind: 'stop' } }]) yield event; } };
}
async function gateway(t, llm = fakeLlm(), extra = {}) {
  const key = randomBytes(32).toString('hex'); const instance = createGateway({ llm, key, port: 0, ...extra }); await instance.start(); t.after(() => instance.close());
  const base = localUrl(instance.port), headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  return { instance, base, headers, key, request: (body, options = {}) => fetch(new URL('/v1/chat/completions', base), { method: 'POST', headers, body: JSON.stringify(body), ...options }) };
}
const body = (extra = {}) => ({ model: 'demo/text', messages: [{ role: 'system', content: 'You are a synthetic fixture' }, { role: 'user', content: 'Hello' }], ...extra });

test('every data endpoint requires a generated local bearer key', async t => {
  const g = await gateway(t);
  for (const route of ['/v1/models', '/health', '/v1/chat/completions']) { const res = await fetch(new URL(route, g.base)); assert.equal(res.status, 401); const result = await res.text(); assert.ok(!result.includes(g.key)); }
  const list = await fetch(new URL('/v1/models', g.base), { headers: g.headers }); assert.equal(list.status, 200); assert.equal((await list.json()).data[0].id, 'demo/text');
});
test('host rebinding and arbitrary website origins are rejected, with no wildcard CORS', async t => {
  const g = await gateway(t);
  const rejected = await fetch(new URL('/v1/models', g.base), { headers: { ...g.headers, Origin: 'https://example.invalid' } }); assert.equal(rejected.status, 403); assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  // Node fetch normalizes Host; raw HTTP proves the actual wire header.
  const hostStatus = await new Promise((resolve, reject) => { const req = httpRequest(new URL('/v1/models', g.base), { headers: { ...g.headers, Host: 'example.invalid' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
  assert.equal(hostStatus, 403);
  const allowed = await fetch(new URL('/v1/models', g.base), { headers: { ...g.headers, Origin: localUrl(8000).slice(0, -1) } });
  assert.equal(allowed.status, 200); assert.ok(allowed.headers.get('access-control-allow-origin') !== '*');
  const preflight = await fetch(new URL('/v1/models', g.base), { method: 'OPTIONS', headers: { Origin: localUrl(8000).slice(0, -1) } }); assert.equal(preflight.status, 204);
});
test('model discovery is live, respects provider allowlist and never returns keys', async t => {
  const llm = fakeLlm(); let model = 'first'; llm.listModels = async () => [{ id: model, name: model }]; const g = await gateway(t, llm);
  for (const expected of ['first', 'second']) { model = expected; const res = await fetch(new URL('/v1/models', g.base), { headers: g.headers }); const raw = await res.text(); assert.ok(raw.includes('demo/' + expected)); assert.ok(!raw.includes(g.key)); }
  const filtered = await gateway(t, llm, { sharedProviders: ['another'] }); const res = await fetch(new URL('/v1/models', filtered.base), { headers: filtered.headers }); assert.deepEqual((await res.json()).data, []);
});
test('JSON text completion maps DSH roles, finish and cache-inclusive usage without reading credentials', async t => {
  const tracker = {}, g = await gateway(t, fakeLlm(undefined, tracker));
  const res = await g.request(body({ temperature: 0.5, max_tokens: 123, stop: ['END'], reasoning_effort: 'high' })), json = await res.json();
  assert.equal(res.status, 200); assert.equal(json.choices[0].message.content, 'Hello 世界'); assert.equal(json.usage.prompt_tokens, 5); assert.equal(json.usage.total_tokens, 9);
  assert.equal(tracker.options.provider, 'demo'); assert.equal(tracker.options.model, 'text'); assert.equal(tracker.options.maxTokens, 123);
  assert.equal(tracker.options.messages[0].source.kind, 'system-prompt'); assert.equal(tracker.options.messages[1].source.kind, 'user'); assert.equal(tracker.calls, 1);
});
test('SSE keeps one id, reasoning separate, finish marker and optional usage', async t => {
  const events = [{ type: 'reasoning-delta', index: 0, text: 'reasoning fixture' }, { type: 'text-delta', index: 1, text: 'Visible' }, { type: 'block-end', index: 1, block: { type: 'text', text: 'Visible' } }, { type: 'usage', usage: { inputTokens: 2, outputTokens: 3 } }, { type: 'finish', reason: { kind: 'max-tokens' } }];
  const g = await gateway(t, fakeLlm(events)), res = await g.request(body({ stream: true, stream_options: { include_usage: true } })), raw = await res.text();
  const chunks = raw.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
  assert.equal(new Set(chunks.map(c => c.id)).size, 1); assert.ok(raw.endsWith('data: [DONE]\n\n'));
  assert.equal(chunks.flatMap(c => c.choices).map(c => c.delta.content || '').join(''), 'Visible');
  assert.ok(chunks.some(c => c.choices[0]?.delta.reasoning_content)); assert.ok(chunks.some(c => c.choices[0]?.finish_reason === 'length')); assert.ok(chunks.some(c => c.usage?.total_tokens === 5));
});
test('block-end-only adapters still produce text, without duplication', async t => {
  const g = await gateway(t, fakeLlm([{ type: 'block-end', index: 0, block: { type: 'text', text: 'Only final block' } }, { type: 'finish', reason: { kind: 'stop' } }]));
  assert.equal((await (await g.request(body())).json()).choices[0].message.content, 'Only final block');
});
test('unknown models, nontext input, tools and invalid settings fail before any model call', async t => {
  const tracker = {}, g = await gateway(t, fakeLlm(undefined, tracker));
  for (const value of [body({ model: 'demo/missing' }), body({ tools: [{}] }), body({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://example.invalid/image' } }] }] }), body({ temperature: 9 }), body({ max_tokens: -1 }), body({ messages: [{ role: 'tool', content: 'tool' }] })]) { const res = await g.request(value); assert.ok([400, 404].includes(res.status)); await res.body.cancel(); }
  assert.equal(tracker.calls, undefined);
});
test('JSON validation and bounded bodies reject unsafe requests', async t => {
  const g = await gateway(t);
  const invalid = await fetch(new URL('/v1/chat/completions', g.base), { method: 'POST', headers: g.headers, body: '{invalid' }); assert.equal(invalid.status, 400);
  const type = await g.request(body(), { headers: { ...g.headers, 'Content-Type': 'text/plain' } }); assert.equal(type.status, 415);
  const huge = await g.request(body({ messages: [{ role: 'user', content: 'x'.repeat(2 * 1024 * 1024) }] })); assert.equal(huge.status, 413);
});
test('reasoning-only output reports a visible error and is never silently retried', async t => {
  const tracker = {}, g = await gateway(t, fakeLlm([{ type: 'reasoning-delta', index: 0, text: 'private reasoning fixture' }, { type: 'finish', reason: { kind: 'stop' } }], tracker));
  const res = await g.request(body()); assert.equal(res.status, 502); assert.equal((await res.json()).error.type, 'empty_content'); assert.equal(tracker.calls, 1);
  const stream = await g.request(body({ stream: true })); assert.ok((await stream.text()).includes('empty_content')); assert.equal(tracker.calls, 2);
});
test('provider exception text is never echoed to the client', async t => {
  const llm = fakeLlm(); llm.stream = async function* () { throw new Error('synthetic-private-credential'); };
  const g = await gateway(t, llm); const res = await g.request(body()); assert.equal(res.status, 502); assert.ok(!(await res.text()).includes('synthetic-private-credential'));
});
test('disconnect and gateway shutdown abort the exact in-flight DSH request', async t => {
  let started, cancelled; const startedPromise = new Promise(r => { started = r; }), cancelledPromise = new Promise(r => { cancelled = r; });
  const llm = fakeLlm(); llm.stream = async function* (options) { started(); await new Promise(resolve => options.signal.addEventListener('abort', () => { cancelled(); resolve(); }, { once: true })); yield { type: 'finish', reason: { kind: 'aborted' } }; };
  const g = await gateway(t, llm), requestAbort = new AbortController(); const pending = g.request(body(), { signal: requestAbort.signal }).catch(() => null); await startedPromise;
  assert.equal(g.instance.activeRequests, 1); requestAbort.abort(); await cancelledPromise; await pending;
  for (let i = 0; i < 30 && g.instance.activeRequests; i++) await new Promise(r => setTimeout(r, 2));
  assert.equal(g.instance.activeRequests, 0); await g.instance.close();
});
test('message conversion preserves in-history system messages and assistant source identities', () => {
  const result = toDshRequest(body({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'developer', content: 'new rules' }] }));
  assert.equal(result.messages[2].role, 'system'); assert.equal(result.messages[1].source.kind, 'model'); assert.ok(result.messages.every(m => typeof m.id === 'string'));
});
test('four-request concurrency boundary refuses a fifth and shutdown cancels all owned requests', async t => {
  let starts = 0, signalStarted; const allStarted = new Promise(r => { signalStarted = r; }); const signals = [];
  const llm = fakeLlm(); llm.stream = async function* (options) { signals.push(options.signal); starts++; if (starts === 4) signalStarted(); await new Promise(resolve => options.signal.addEventListener('abort', resolve, { once: true })); yield { type: 'finish', reason: { kind: 'aborted' } }; };
  const g = await gateway(t, llm), requests = Array.from({ length: 4 }, () => g.request(body()).catch(() => null)); await allStarted;
  assert.equal(g.instance.activeRequests, 4); const fifth = await g.request(body()); assert.equal(fifth.status, 429); assert.equal(starts, 4);
  await g.instance.close(); assert.ok(signals.every(signal => signal.aborted)); await Promise.all(requests);
});
test('request deadline is propagated and unsupported terminal outcomes cannot claim success', async t => {
  let wasAborted = false; const llm = fakeLlm(); llm.stream = async function* (options) { await new Promise(resolve => options.signal.addEventListener('abort', () => { wasAborted = true; resolve(); }, { once: true })); yield { type: 'finish', reason: { kind: 'aborted' } }; };
  const timed = await gateway(t, llm, { timeoutMs: 15 }); const response = await timed.request(body()); assert.equal(response.status, 408); assert.equal(wasAborted, true);
  const unsupported = await gateway(t, fakeLlm([{ type: 'text-delta', index: 0, text: 'partial' }, { type: 'finish', reason: { kind: 'tool-calls' } }])); const result = await unsupported.request(body()); assert.equal(result.status, 502);
});
test('a deadline reached while reading the catalog prevents model dispatch entirely', async t => {
  const tracker = {}, llm = fakeLlm(undefined, tracker); llm.listModels = async () => { await new Promise(r => setTimeout(r, 30)); return [{ id: 'text', name: 'Text' }]; };
  const g = await gateway(t, llm, { timeoutMs: 5 }); const response = await g.request(body()); assert.equal(response.status, 408); assert.equal(tracker.calls, undefined);
});
