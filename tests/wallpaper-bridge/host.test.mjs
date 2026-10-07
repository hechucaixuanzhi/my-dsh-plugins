import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';
import { apply, normalizeConfig } from '../../plugins/wallpaper-bridge/lib/index.js';
import { resolveWallpaperFile, serveFile } from '../../plugins/wallpaper-bridge/lib/we.js';
import { readPkg } from '../../plugins/wallpaper-bridge/lib/pkg.js';
import { findPng, findJpeg } from '../../plugins/wallpaper-bridge/lib/art.js';

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'wallpaper-bridge-fixture-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
function response() {
  return { status: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    writeHead(status, headers = {}) { this.status = status; Object.entries(headers).forEach(([k, v]) => this.setHeader(k, v)); },
    end(value = '') { this.body += value; } };
}
function routesOnly() {
  const routes = [];
  // Never run the config loader or WE polling against the user's machine.
  apply({ effect(fn, label) { if (label.endsWith(' route')) return fn(); },
    webServer: { register(route) { routes.push(route); return () => {}; } } });
  return routes;
}

test('package is independent, versioned, explicit and asset-free', async () => {
  const base = new URL('../../plugins/wallpaper-bridge/', import.meta.url);
  const pkg = JSON.parse(await readFile(new URL('package.json', base), 'utf8'));
  assert.equal(pkg.name, '@dsh-local/we-skin'); assert.equal(pkg.peerDependencies['@deepseek-ai/dsh'], '0.2.0-rc.2');
  assert.equal(pkg.exports['./client'], './lib/client-v2.js'); assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  const patch = await readFile(new URL('cordis.patch.yml', base), 'utf8');
  assert.match(patch, /id: skin-we\s+name: ['"]@dsh-local\/we-skin['"]/);
  assert.equal(pkg.files.filter(f => f.endsWith('.js')).length, 5);
  assert.ok(!pkg.files.some(f => /(?:shell|client\.js$|testing|\.png$|config\.json)/.test(f)));
  assert.equal(pkg.scripts, undefined);
});

test('settings clamp numeric bounds and reject prototype keys', () => {
  const config = normalizeConfig({ zoom: 99, positionX: -1, blur: 100, fit: 'wrong', transitionMs: -50,
    perWallpaper: JSON.parse('{"one":{"zoom":2},"__proto__":{"zoom":4},"constructor":{"zoom":4}}') });
  assert.equal(config.zoom, 4); assert.equal(config.positionX, 0); assert.equal(config.blur, 30);
  assert.equal(config.fit, 'cover'); assert.equal(config.transitionMs, 0);
  assert.deepEqual(Object.keys(config.perWallpaper), ['one']); assert.equal({}.zoom, undefined);
});

test('local-only boundary rejects network peers before every route', async () => {
  const routes = routesOnly(); assert.equal(routes.length, 7);
  for (const route of routes) {
    const res = response(); await route.handler({ socket: { remoteAddress: '192.0.2.1' }, headers: {} }, res);
    assert.equal(res.status, 403, route.path);
  }
  const health = routes.find(r => r.path.endsWith('/health'));
  for (const peer of [undefined, '127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    const res = response(); await health.handler({ socket: peer ? { remoteAddress: peer } : undefined, headers: {} }, res);
    assert.equal(res.status, 200); assert.equal(JSON.parse(res.body).version, '0.3.6-dsh020rc2.1');
  }
});

test('settings write rejects form posts, opaque and cross-site origins without reading config', async () => {
  const route = routesOnly().find(r => r.path.endsWith('/config'));
  for (const headers of [
    { 'content-type': 'text/plain' },
    { 'content-type': 'application/json', origin: 'null' },
    { 'content-type': 'application/json', origin: 'https://example.invalid' },
    { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
  ]) {
    const res = response(); await route.handler({ method: 'POST', headers }, res);
    assert.ok([403, 415].includes(res.status));
  }
});

test('malformed settings JSON fails without touching user storage', async () => {
  const route = routesOnly().find(r => r.path.endsWith('/config')), req = new EventEmitter(), res = response();
  Object.assign(req, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'dsh-app://app' } });
  const pending = route.handler(req, res); req.emit('data', Buffer.from('{')); req.emit('end'); await pending;
  assert.equal(res.status, 400);
});

test('web HTML carries response-level sandbox even when opened outside the iframe', async () => {
  const source = await readFile(new URL('../../plugins/wallpaper-bridge/lib/index.js', import.meta.url), 'utf8');
  const start = source.indexOf('function polyfillScript('), end = source.indexOf('export function apply(');
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({ fsp: { readFile: async () => '<html><head></head><body>synthetic</body></html>' } });
  vm.runInContext(source.slice(start, end) + '\nglobalThis.renderHtml = serveWebHtml;', context);
  const res = response(); context.renderHtml('synthetic.html', { properties: { demo: '</script><script>parent.document</script>' } }, res);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-security-policy'], "sandbox allow-scripts; connect-src 'none'; form-action 'none'");
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(!res.body.includes('</script><script>parent.document'));
  assert.ok(res.body.includes('\\u003c/script>'));
});

test('file resolver rejects malformed input, traversal and escaping junctions', async t => {
  const dir = await fixture(t), root = path.join(dir, 'wallpaper'), outside = path.join(dir, 'outside');
  await mkdir(root); await mkdir(outside); await writeFile(path.join(root, 'image.png'), 'synthetic');
  await writeFile(path.join(outside, 'private.txt'), 'synthetic only');
  assert.equal(resolveWallpaperFile(root, '/image.png'), path.join(root, 'image.png'));
  for (const rel of ['/..%5coutside%5cprivate.txt', '/../outside/private.txt', '/%00', '/%', '/missing', '/']) assert.equal(resolveWallpaperFile(root, rel), null, rel);
  await symlink(outside, path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(resolveWallpaperFile(root, '/link/private.txt'), null);
});

test('video Range suffix, oversized end, invalid ranges and HEAD preserve correct lengths', async t => {
  const dir = await fixture(t), file = path.join(dir, 'video.mp4'); await writeFile(file, '0123456789');
  const server = createServer((req, res) => serveFile(file, req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())));
  const base = new URL('http://example.invalid'); base.hostname = '127.0.0.1'; base.port = String(server.address().port);
  for (const [range, status, body, contentRange] of [
    ['bytes=0-3', 206, '0123', 'bytes 0-3/10'], ['bytes=-3', 206, '789', 'bytes 7-9/10'],
    ['bytes=7-99', 206, '789', 'bytes 7-9/10'], ['bytes=-99', 206, '0123456789', 'bytes 0-9/10'],
    ['bytes=-0', 416, '', 'bytes */10'], ['bytes=10-', 416, '', 'bytes */10'], ['bytes=5-2', 416, '', 'bytes */10'],
  ]) {
    const res = await fetch(base, { headers: { Range: range } });
    assert.equal(res.status, status); assert.equal(res.headers.get('content-range'), contentRange); assert.equal(await res.text(), body);
  }
  const head = await fetch(base, { method: 'HEAD', headers: { Range: 'bytes=2-5' } });
  assert.equal(head.status, 206); assert.equal(head.headers.get('content-length'), '4'); assert.equal(await head.text(), '');
  const normal = await fetch(base); assert.equal(normal.status, 200); assert.equal(await normal.text(), '0123456789');
});

test('scene parser and PNG/JPEG detection use synthetic bytes, not workshop artwork', async t => {
  const dir = await fixture(t), file = path.join(dir, 'scene.pkg'), magic = Buffer.from('PKGV0001'), name = Buffer.from('art.tex');
  const payload = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  await writeFile(file, Buffer.concat([u32(magic.length), magic, u32(1), u32(name.length), name, u32(0), u32(payload.length), payload]));
  const pkg = await readPkg(file); assert.equal(pkg.entries[0].path, 'art.tex');
  assert.deepEqual(findJpeg(pkg.buf.subarray(pkg.entries[0].offset)), [0, 6]);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), Buffer.alloc(4)]);
  assert.deepEqual(findPng(png), [0, 20]); assert.equal(findPng(Buffer.alloc(16)), null);
});
