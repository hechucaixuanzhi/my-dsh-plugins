import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { localUrl } from './config.js';

export async function inspectInstallation(directory) {
  if (!directory) throw new Error('请先下载并安装 SillyTavern，然后在设置中填写目录 / Install SillyTavern first and set its directory');
  try {
    const [entry, dependencies, raw] = await Promise.all([fs.stat(path.join(directory, 'server.js')), fs.stat(path.join(directory, 'node_modules')), fs.readFile(path.join(directory, 'package.json'), 'utf8')]);
    const manifest = JSON.parse(raw);
    if (!entry.isFile() || !dependencies.isDirectory() || manifest.name !== 'sillytavern') throw new Error('Invalid installation');
    return { version: String(manifest.version || 'unknown') };
  } catch { throw new Error('酒馆目录或依赖不完整；请先按官方教程安装 / Complete the official SillyTavern installation and dependencies first'); }
}

export async function probeTavern(url, fetchPage = fetch) {
  try {
    const response = await fetchPage(url, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    // Bound the probe: never read an unbounded page from an occupied port.
    let bytes = 0, html = '';
    const reader = response.body?.getReader();
    try {
      if (reader) while (bytes < 128 * 1024) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; html += new TextDecoder().decode(value); }
    } finally { await reader?.cancel().catch(() => {}); }
    return response.ok && /<title>\s*SillyTavern\s*<\/title>/i.test(html) ? 'ready' : 'occupied';
  } catch (error) {
    // A timeout is not proof that the port is free; never spawn on ambiguity.
    return error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED' ? 'absent' : 'unknown';
  }
}

export function createTavernLauncher({ spawnProcess = spawn, probe = probeTavern, inspect = inspectInstallation, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now, timeoutMs = 30000 } = {}) {
  let pending, child, starting = false;
  async function start(config) {
    const installed = await inspect(config.tavernDirectory), url = localUrl(config.tavernPort);
    const current = await probe(url);
    if (current === 'ready') return { status: 'ready', url, version: installed.version, reused: true };
    if (current !== 'absent') throw new Error('端口被占用、需要登录或状态不明；不会覆盖服务 / Port occupied, login required, or status unknown; no process started');
    if (child) throw new Error('之前启动的酒馆进程尚未退出；请检查其状态 / Previous SillyTavern process is still running');
    child = spawnProcess(config.nodeCommand, ['server.js', '--no-browserLaunchEnabled', '--port', String(config.tavernPort)], {
      cwd: config.tavernDirectory, windowsHide: true, shell: false, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' },
    });
    const currentChild = child;
    let processError = false, exited = false;
    currentChild.once('error', () => { processError = true; if (child === currentChild) child = undefined; });
    currentChild.once('exit', () => { exited = true; if (child === currentChild) child = undefined; });
    currentChild.unref();
    const deadline = now() + timeoutMs;
    while (now() < deadline) {
      await sleep(400);
      if (processError) throw new Error('无法启动 Node；请检查 Node 可执行路径 / Could not start Node; check its executable');
      if (exited) throw new Error('酒馆提前退出；请手动启动检查依赖和配置 / SillyTavern exited; start it manually to inspect dependencies/configuration');
      const state = await probe(url);
      if (state === 'ready') return { status: 'ready', url, version: installed.version, reused: false };
    }
    // Do not kill a possibly live user service after a timeout. Keep its handle
    // so retry cannot create a duplicate while that child is still running.
    throw new Error('启动超时；不会重复拉起或强杀进程 / Startup timed out; no duplicate or forced termination');
  }
  return {
    get busy() { return starting; },
    ensureStarted(config) {
      if (!pending) { starting = true; pending = start(config).finally(() => { pending = undefined; starting = false; }); }
      return pending;
    },
  };
}
