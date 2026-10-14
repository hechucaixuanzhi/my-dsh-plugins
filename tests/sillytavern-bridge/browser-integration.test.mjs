// Optional real SillyTavern/browser check. Only disposable data and a fake LLM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createRuntime } from '../../plugins/sillytavern-bridge/lib/index.js';
import { normalizeConfig, localUrl } from '../../plugins/sillytavern-bridge/lib/config.js';

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve)); return port;
}

test('real Tavern first-open, saved settings and reopen connect without a manual Connect click', {
  skip: !process.env.TAVERN_TEST_SOURCE || !process.env.BRIDGE_PLAYWRIGHT || !process.env.BRIDGE_CHROMIUM ? 'Set isolated Tavern source, Playwright module and Chromium paths; NOT native DSH acceptance' : false,
  timeout: 300000,
}, async t => {
  const source = path.resolve(process.env.TAVERN_TEST_SOURCE);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-tavern-browser-'));
  let child, browser, runtime;
  t.after(async () => {
    await browser?.close(); await runtime?.dispose();
    if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; }
    await fs.rm(root, { recursive: true, force: true });
  });
  for (const name of ['public', 'src', 'default', 'server.js', 'plugins.js', 'package.json', 'webpack.config.js']) {
    await fs.cp(path.join(source, name), path.join(root, name), { recursive: true });
  }
  await fs.symlink(path.join(source, 'node_modules'), path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const require = createRequire(path.join(source, 'package.json')), yaml = require('yaml');
  const config = yaml.parse(await fs.readFile(path.join(source, 'default', 'config.yaml'), 'utf8'));
  const tavernPort = await freePort(), gatewayPort = await freePort();
  Object.assign(config, { dataRoot: './data', port: tavernPort, listen: false, browserLaunchEnabled: false, enableUserAccounts: false, enableExtensions: true });
  if (config.extensions) config.extensions.enabled = true;
  await fs.writeFile(path.join(root, 'config.yaml'), yaml.stringify(config));
  // Start only this disposable copy; do not touch any running user service.
  let serverLog = '';
  child = spawn(process.execPath, ['server.js', '--no-browserLaunchEnabled', '--port', String(tavernPort)], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { serverLog = (serverLog + data).slice(-4000); });
  child.stderr.on('data', data => { serverLog = (serverLog + data).slice(-4000); });
  for (let attempt = 0; ; attempt++) {
    if (child.exitCode !== null) assert.fail('Disposable Tavern exited during startup');
    try { if ((await fetch(localUrl(tavernPort), { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* wait for this owned server */ }
    if (attempt >= 500) { t.diagnostic(serverLog); assert.fail('Disposable Tavern startup timed out'); }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  let generations = 0;
  const key = randomBytes(32).toString('hex');
  const bridgeConfig = normalizeConfig({ tavernDirectory: root, tavernPort, gatewayPort, sharingEnabled: true });
  runtime = createRuntime({ store: { load: async () => bridgeConfig, gatewayKey: async () => key },
    llm: { listProviders: () => [{ id: 'synthetic' }], listModels: async () => [{ id: 'test-model', name: 'Synthetic model' }], stream: async function* () { generations++; throw new Error('Generation must not run'); } },
  });
  const { chromium } = await import(pathToFileURL(path.resolve(process.env.BRIDGE_PLAYWRIGHT)).href);
  browser = await chromium.launch({ executablePath: process.env.BRIDGE_CHROMIUM, headless: true });
  const page = await browser.newPage();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const events = []; page.on('console', message => { const text = message.text(); if (text.startsWith('Event emitted:')) events.push(text); });
  let statusRequests = 0;
  page.on('response', response => { if (new URL(response.url()).pathname === '/api/backends/chat-completions/status' && response.ok()) statusRequests++; });
  const open = async () => {
    const result = await runtime.ensureStarted();
    const handedOff = page.waitForResponse(response => new URL(response.url()).pathname === '/bridge/connect' && response.request().method() === 'POST' && response.ok(), { timeout: 30000 });
    await page.goto(result.url, { waitUntil: 'domcontentloaded' });
    // Complete Tavern's own first-run welcome dialog; never click Connect.
    const welcome = page.locator('dialog[open] .onboarding');
    try { await welcome.waitFor({ state: 'visible', timeout: 5000 }); await page.locator('dialog[open] .popup-button-ok').click(); }
    catch { /* already onboarded on later opens */ }
    await handedOff;
    try { await page.waitForFunction(() => {
      const ctx = SillyTavern.getContext();
      return ctx.mainApi === 'openai' && ctx.chatCompletionSettings.custom_model === 'synthetic/test-model' && ctx.chatCompletionSettings.chat_completion_source === 'custom';
    }, null, { timeout: 20000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.online_status_text')].some(node => /Valid|有效的/.test(node.textContent)), null, { timeout: 30000 });
    } catch (error) {
      t.diagnostic(JSON.stringify(await page.evaluate(() => ({
        context: typeof SillyTavern !== 'undefined',
        api: typeof SillyTavern !== 'undefined' ? SillyTavern.getContext().mainApi : null,
        model: typeof SillyTavern !== 'undefined' ? SillyTavern.getContext().chatCompletionSettings.custom_model : null,
        fragmentPresent: !!location.hash,
        status: [...document.querySelectorAll('.online_status_text')].map(node => node.textContent),
        toast: [...document.querySelectorAll('.toast-message')].map(node => node.textContent),
        fired: typeof SillyTavern !== 'undefined' ? [...SillyTavern.getContext().eventSource.autoFireLastArgs.keys()] : [],
        dialogs: [...document.querySelectorAll('dialog[open]')].map(node => node.textContent.slice(0, 100)),
      })))); t.diagnostic(JSON.stringify(errors)); t.diagnostic(JSON.stringify(events.slice(-20))); throw error;
    }
    assert.equal(await page.evaluate(() => location.hash), '');
  };
  await open();
  const data = path.join(root, 'data', 'default-user');
  const firstSettings = JSON.parse(await fs.readFile(path.join(data, 'settings.json'), 'utf8'));
  assert.equal(firstSettings.power_user.auto_connect, true);
  assert.equal(firstSettings.oai_settings.custom_url, localUrl(gatewayPort, '/v1'));
  assert.ok(firstSettings.extension_settings.dsh_tavern_bridge.previousConnection);
  assert.ok(!JSON.stringify(firstSettings).includes(key));
  await open();
  const secrets = JSON.parse(await fs.readFile(path.join(data, 'secrets.json'), 'utf8'));
  assert.equal(secrets.api_key_custom.filter(secret => secret.label === 'DSH Tavern Bridge').length, 1);
  // Ordinary reload has no handoff: Tavern's persisted built-in switch connects.
  const reconnected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/backends/chat-completions/status' && response.ok());
  await page.reload({ waitUntil: 'domcontentloaded' }); await reconnected;
  await page.waitForFunction(() => [...document.querySelectorAll('.online_status_text')].some(node => /Valid|有效的/.test(node.textContent)));
  assert.ok(statusRequests >= 2); assert.equal(generations, 0);
  assert.deepEqual(errors, []);
});
