import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const MAX_BODY = 2 * 1024 * 1024;
const MAX_OUTPUT = 8 * 1024 * 1024;
export class BridgeError extends Error {
  constructor(status, message, code = 'bridge_error') { super(message); this.status = status; this.code = code; }
}
function json(res, status, payload) {
  if (res.destroyed) return;
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': body.length, 'Cache-Control': 'no-store' }); res.end(body);
}
const errorBody = error => ({ error: { message: error instanceof BridgeError ? error.message : 'DSH model request failed; check the provider in DSH / 请在 DSH 检查模型提供方', type: error instanceof BridgeError ? error.code : 'upstream_error' } });
export function authenticated(value, key) {
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return false;
  const candidate = Buffer.from(value.slice(7)), expected = Buffer.from(key);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
export async function modelCatalog(llm, sharedProviders = []) {
  const list = [];
  for (const provider of llm.listProviders()) {
    if (sharedProviders.length && !sharedProviders.includes(provider.id)) continue;
    const models = await llm.listModels(provider.id);
    for (const model of models) list.push({ id: `${provider.id}/${model.id}`, object: 'model', created: 0, owned_by: provider.id, name: model.name });
  }
  return list;
}
function textContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content) && content.every(p => p && p.type === 'text' && typeof p.text === 'string')) return content.map(p => p.text).join('');
  throw new BridgeError(400, 'Only text chat is supported; images, audio and tools are not silently dropped', 'unsupported_content');
}
export function toDshRequest(body, signal) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BridgeError(400, 'Expected a JSON object');
  if (typeof body.model !== 'string' || body.model.length > 500 || body.model.indexOf('/') <= 0) throw new BridgeError(400, 'Select provider/model from the gateway list');
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4000) throw new BridgeError(400, 'Expected 1–4000 messages');
  if (body.tools?.length || body.functions?.length || (body.n !== undefined && body.n !== 1)) throw new BridgeError(400, 'Tools and multiple completions are not supported', 'unsupported_request');
  if (body.stream !== undefined && typeof body.stream !== 'boolean') throw new BridgeError(400, 'stream must be a boolean');
  const split = body.model.indexOf('/'), provider = body.model.slice(0, split), model = body.model.slice(split + 1);
  const messages = body.messages.map(message => {
    if (!message || !['system', 'developer', 'user', 'assistant'].includes(message.role) || message.tool_calls?.length || message.function_call) throw new BridgeError(400, 'Unsupported message role or tool call');
    const role = message.role === 'developer' ? 'system' : message.role;
    return { id: randomUUID(), role, content: [{ type: 'text', text: textContent(message.content) }], source: role === 'assistant' ? { kind: 'model', provider, model } : role === 'system' ? { kind: 'system-prompt' } : { kind: 'user' } };
  });
  const options = { provider, model, messages, signal };
  const max = body.max_tokens ?? body.max_completion_tokens;
  if (max !== undefined) { if (!Number.isInteger(max) || max < 1 || max > 131072) throw new BridgeError(400, 'max_tokens must be 1–131072'); options.maxTokens = max; }
  if (body.temperature !== undefined) { if (!Number.isFinite(body.temperature) || body.temperature < 0 || body.temperature > 2) throw new BridgeError(400, 'temperature must be 0–2'); options.temperature = body.temperature; }
  if (body.reasoning_effort !== undefined) { if (typeof body.reasoning_effort !== 'string' || !/^[A-Za-z0-9_.-]{1,50}$/.test(body.reasoning_effort)) throw new BridgeError(400, 'Invalid reasoning_effort'); options.reasoningEffort = body.reasoning_effort; }
  if (body.stop !== undefined && body.stop !== null) { const stop = typeof body.stop === 'string' ? [body.stop] : body.stop; if (!Array.isArray(stop) || stop.length > 16 || stop.some(v => typeof v !== 'string' || v.length > 2048)) throw new BridgeError(400, 'Invalid stop sequences'); options.stop = stop; }
  return options;
}
function mappedUsage(usage) {
  if (!usage) return undefined;
  const input = (usage.inputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0), output = usage.outputTokens || 0;
  return { prompt_tokens: input, completion_tokens: output, total_tokens: usage.totalTokens ?? input + output };
}
async function chat(llm, body, res, signal, catalog) {
  if (signal.aborted) throw new BridgeError(408, 'Request cancelled or timed out before model dispatch', 'cancelled');
  const options = toDshRequest(body, signal);
  if (!catalog.some(model => model.id === body.model)) throw new BridgeError(404, 'Model unavailable or not shared; refresh the model list', 'model_not_found');
  const id = 'chatcmpl-' + randomUUID(), created = Math.floor(Date.now() / 1000);
  const chunk = (delta, finish = null) => ({ id, object: 'chat.completion.chunk', created, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
  const send = value => { if (!res.destroyed) res.write(`data: ${JSON.stringify(value)}\n\n`); };
  const streaming = body.stream === true;
  let content = '', reasoning = '', usage, terminal, outputSize = 0;
  const deltas = new Set();
  if (streaming) { res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' }); send(chunk({ role: 'assistant', content: '' })); }
  const accept = (kind, text) => {
    outputSize += Buffer.byteLength(text);
    if (outputSize > MAX_OUTPUT) throw new BridgeError(502, 'Model output exceeded the bridge limit', 'output_limit');
    if (kind === 'text') content += text; else reasoning += text;
    if (streaming) send(chunk(kind === 'text' ? { content: text } : { reasoning_content: text }));
  };
  try {
    for await (const event of llm.stream(options)) {
      if (signal.aborted) throw new BridgeError(408, 'Request cancelled or timed out', 'cancelled');
      if (event.type === 'text-delta' || event.type === 'reasoning-delta') { deltas.add(event.index); accept(event.type === 'text-delta' ? 'text' : 'reasoning', event.text); }
      else if (event.type === 'block-end' && !deltas.has(event.index) && ['text', 'reasoning'].includes(event.block?.type)) accept(event.block.type, event.block.text);
      else if (event.type === 'tool-call-delta' || (event.type === 'block-end' && event.block?.type === 'tool-call')) throw new BridgeError(502, 'Unexpected tool output; bridge does not execute tools', 'unsupported_output');
      else if (event.type === 'usage') usage = mappedUsage(event.usage);
      else if (event.type === 'finish') {
        if (['error', 'aborted'].includes(event.reason.kind)) throw new BridgeError(502, 'DSH model failed or was cancelled; check DSH without sharing credentials', 'upstream_error');
        if (!['stop', 'max-tokens'].includes(event.reason.kind)) throw new BridgeError(502, 'Unsupported model finish reason', 'unsupported_output');
        terminal = event.reason.kind === 'max-tokens' ? 'length' : 'stop'; break;
      }
    }
    if (!terminal) throw new BridgeError(502, 'Model stream ended without a completion marker', 'incomplete_stream');
    if (!content.trim()) throw new BridgeError(502, 'Model returned no visible text; no automatic paid retry was made', 'empty_content');
    if (streaming) {
      send(chunk({}, terminal));
      if (body.stream_options?.include_usage && usage) send({ id, object: 'chat.completion.chunk', created, model: body.model, choices: [], usage });
      if (!res.destroyed) res.end('data: [DONE]\n\n');
    } else json(res, 200, { id, object: 'chat.completion', created, model: body.model, choices: [{ index: 0, message: { role: 'assistant', content, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: terminal }], ...(usage ? { usage } : {}) });
  } catch (error) {
    if (streaming && res.headersSent) { send(errorBody(error)); if (!res.destroyed) res.end('data: [DONE]\n\n'); }
    else throw error;
  }
}
async function readBody(req) {
  let length = 0; const pieces = [];
  for await (const piece of req) { length += piece.length; if (length > MAX_BODY) throw new BridgeError(413, 'Request body exceeds 2 MiB'); pieces.push(piece); }
  try { return JSON.parse(Buffer.concat(pieces).toString('utf8')); } catch { throw new BridgeError(400, 'Invalid JSON'); }
}

export function createGateway({ llm, key, port = 8100, tavernPort = 8000, sharedProviders = [], timeoutMs = 180000 }) {
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new Error('A generated local gateway key is required');
  const active = new Set(); let disposed = false;
  const origins = new Set(['127.0.0.1', 'localhost'].map(host => `http://${host}:${tavernPort}`));
  const server = http.createServer(async (req, res) => {
    let controller, timer, abort;
    try {
      if (disposed) throw new BridgeError(503, 'Gateway stopped');
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw new BridgeError(403, 'Local access only');
      let host;
      try { host = new URL('http://' + req.headers.host); } catch { throw new BridgeError(403, 'Invalid Host'); }
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) || Number(host.port) !== server.address()?.port) throw new BridgeError(403, 'Untrusted Host');
      if (req.headers.origin && !origins.has(req.headers.origin)) throw new BridgeError(403, 'Origin not allowed');
      if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
      const route = new URL(req.url, 'https://example.invalid').pathname;
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }); res.end(); return; }
      if (!authenticated(req.headers.authorization, key)) throw new BridgeError(401, 'Local gateway API key required', 'authentication_error');
      if (req.method === 'GET' && route === '/health') { json(res, 200, { ok: true, service: '@dsh-local/sillytavern-bridge', activeRequests: active.size }); return; }
      if (req.method === 'GET' && route === '/v1/models') { json(res, 200, { object: 'list', data: await modelCatalog(llm, sharedProviders) }); return; }
      if (req.method !== 'POST' || route !== '/v1/chat/completions') throw new BridgeError(404, 'Unknown route');
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new BridgeError(415, 'application/json required');
      if (active.size >= 4) throw new BridgeError(429, 'At most four concurrent model requests');
      controller = new AbortController(); active.add(controller);
      abort = () => { if (!res.writableFinished) controller.abort(); }; req.on('aborted', abort); res.on('close', abort);
      timer = setTimeout(() => controller.abort(), timeoutMs); timer.unref();
      const body = await readBody(req), catalog = await modelCatalog(llm, sharedProviders);
      await chat(llm, body, res, controller.signal, catalog);
    } catch (error) { if (!res.headersSent) json(res, error instanceof BridgeError ? error.status : 502, errorBody(error)); else if (!res.destroyed) res.end(); }
    finally { clearTimeout(timer); if (controller) active.delete(controller); if (abort) { req.off('aborted', abort); res.off('close', abort); } }
  });
  server.requestTimeout = 15000; server.headersTimeout = 15000; server.keepAliveTimeout = 5000; server.maxConnections = 32;
  // Keep errors local; never log request bodies, provider exceptions or keys.
  server.on('clientError', (_error, socket) => socket.destroy());
  return {
    get activeRequests() { return active.size; },
    get port() { return server.address()?.port; },
    async start() {
      await new Promise((resolve, reject) => { const fail = () => { server.off('listening', ready); reject(new Error('网关端口不可用；不会接管旧网关 / Gateway port unavailable; existing service not adopted')); }; const ready = () => { server.off('error', fail); resolve(); }; server.once('error', fail); server.once('listening', ready); server.listen(port, '127.0.0.1'); });
      server.on('error', () => {});
    },
    async close() { disposed = true; for (const request of active) request.abort(); if (!server.listening) return; const finished = new Promise(resolve => server.close(resolve)); server.closeAllConnections(); await finished; },
  };
}
