import { promises as fs } from 'node:fs';
import { ConfigStore, VERSION, normalizeConfig, localUrl } from './config.js';
import { createTavernLauncher, inspectInstallation } from './launcher.js';
import { createGateway, BridgeError } from './gateway.js';
import { installTavernExtension } from './extension-installer.js';

export const name = '@dsh-local/sillytavern-bridge';
export const inject = ['connection', 'llm'];
const PREFIX = '/api/sillytavern-bridge';

export function createRuntime({ llm, store = new ConfigStore(), launcher = createTavernLauncher(), gatewayFactory = createGateway, inspect = inspectInstallation, installExtension = installTavernExtension } = {}) {
  let gateway, pending, disposed = false, saving = false;
  const check = () => { if (disposed) throw new BridgeError(503, '插件已停用 / Plugin stopped'); };
  return {
    async state() {
      check(); const config = await store.load(); check();
      return { version: VERSION, config, gatewayRunning: !!gateway, gatewayBaseUrl: localUrl(config.gatewayPort, '/v1'), gatewayActiveRequests: gateway?.activeRequests || 0, workspaceGuideAvailable: true };
    },
    async save(value) {
      check();
      if (saving || pending || gateway?.activeRequests) throw new BridgeError(409, '请等待启动或模型请求结束后再保存 / Wait for startup and model requests before saving');
      const config = normalizeConfig(value); saving = true;
      try { await store.save(config); if (gateway) { await gateway.close(); gateway = undefined; } check(); return { ok: true }; }
      finally { saving = false; }
    },
    async gatewayKey() {
      check(); const config = await store.load();
      if (!config.sharingEnabled) throw new BridgeError(409, '请先明确开启模型共享 / Enable model sharing explicitly first');
      const key = await store.gatewayKey(); check(); return { key };
    },
    ensureStarted() {
      check(); if (saving) return Promise.reject(new BridgeError(409, '配置正在保存 / Configuration is being saved'));
      if (!pending) pending = (async () => {
        const config = await store.load(); check();
        const installation = await inspect(config.tavernDirectory); check();
        if (config.sharingEnabled) {
          if (installation.version !== '1.19.0') throw new BridgeError(409, '自动连接仅验证 SillyTavern 1.19.0 / Auto-connect requires SillyTavern 1.19.0');
          await installExtension(config.tavernDirectory); check();
        }
        const result = await launcher.ensureStarted(config); check();
        if (config.sharingEnabled && !gateway) {
          const key = await store.gatewayKey(); check();
          const candidate = gatewayFactory({ llm, key, port: config.gatewayPort, tavernPort: config.tavernPort, sharedProviders: config.sharedProviders });
          gateway = candidate;
          try { await candidate.start(); if (disposed) { await candidate.close(); throw new BridgeError(503, 'Plugin stopped during startup'); } }
          catch (error) { await candidate.close(); if (gateway === candidate) gateway = undefined; throw error; }
        }
        check();
        const url = new URL(result.url);
        if (gateway) url.hash = `dsh-bridge=${config.gatewayPort}.${gateway.issueHandoff()}`;
        return { ...result, url: url.href, gatewayRunning: !!gateway };
      })().finally(() => { pending = undefined; });
      return pending;
    },
    async dispose() { disposed = true; if (gateway) { const owned = gateway; gateway = undefined; await owned.close(); } },
  };
}

export function apply(ctx) {
  const runtime = createRuntime({ llm: ctx.llm });
  const handlers = {
    '/state': () => runtime.state(),
    '/config': body => runtime.save(body),
    '/start': () => runtime.ensureStarted(),
    '/gateway-key': () => runtime.gatewayKey(),
    '/workspace-guide': async body => ({ text: await fs.readFile(new URL(body.language === 'en' ? '../WORKSPACE.en.md' : '../WORKSPACE.md', import.meta.url), 'utf8') }),
  };
  for (const [suffix, action] of Object.entries(handlers)) ctx.effect(() => ctx.connection.fetch.register({
    path: PREFIX + suffix, methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return Response.json({ error: 'application/json required' }, { status: 415 });
      const declared = Number(request.headers.get('content-length'));
      if (declared > 16384) return Response.json({ error: 'Request too large' }, { status: 413 });
      let body;
      try { const raw = await request.text(); if (Buffer.byteLength(raw) > 16384) return Response.json({ error: 'Request too large' }, { status: 413 }); body = JSON.parse(raw || '{}'); }
      catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Expected object' }, { status: 400 });
      try { return Response.json(await action(body), { headers: { 'Cache-Control': 'no-store' } }); }
      catch (error) { return Response.json({ error: error.message || 'Bridge operation failed' }, { status: error instanceof BridgeError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } }); }
    },
  }), 'sillytavern-bridge' + suffix);
  ctx.effect(() => () => runtime.dispose(), 'sillytavern-bridge.gateway-lifecycle');
}
