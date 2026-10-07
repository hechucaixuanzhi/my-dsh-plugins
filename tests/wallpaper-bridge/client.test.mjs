import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../plugins/wallpaper-bridge/', import.meta.url);
const source = await readFile(new URL('lib/client-v2.js', root), 'utf8');

function harness(protocol = 'dsh-app:', streamBaseUrl) {
  let registration, view, dispose;
  const intervals = [], removed = [], attributes = new Map(), nodes = new Map(), requests = [];
  let events = 0, closed = 0;
  const style = { setProperty() {}, removeProperty() {} };
  function element(tag) {
    const el = { tagName: tag.toUpperCase(), style: { ...style }, classList: { add() {}, remove() {} },
      setAttribute(key, value) { attributes.set(`${tag}:${key}`, value); },
      appendChild(child) { if (child.id) nodes.set(child.id, child); },
      remove() { removed.push(tag); nodes.delete(this.id); } };
    return el;
  }
  const ctx = vm.createContext({
    window: { __ModuleLoader__: { load: value => { registration = value; } }, __DSH_TRANSPORT__: { streamBaseUrl }, innerWidth: 1280, innerHeight: 800 },
    location: { protocol, search: '' }, navigator: { userAgent: 'synthetic-test' },
    document: { getElementById: id => nodes.get(id), createElement: element, head: element('head'), body: element('body'),
      documentElement: { style }, querySelectorAll: () => [] },
    fetch: url => { requests.push(url); return new Promise(() => {}); },
    setInterval: (_fn, ms) => { intervals.push(ms); return 1; }, clearInterval: () => {},
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: fn => fn(),
    EventSource: class { constructor() { events++; } addEventListener() {} close() { closed++; } },
    URL, URLSearchParams, console,
  });
  vm.runInContext(source, ctx);
  assert.equal(registration.id, '@dsh-local/we-skin');
  const react = { createElement: (...args) => args, useSyncExternalStore: () => null };
  const plugin = registration.factory(() => react);
  // A copy of the factory only exposes pure helpers to this synthetic harness.
  // Production source remains unchanged, with no debug globals.
  const testSource = source.replace('return module.exports', 'module.exports.helpers = { desktopMediaUrl, createMedia, effectiveConfig }; return module.exports');
  vm.runInContext(testSource, ctx);
  const helpers = registration.factory(() => react).helpers;
  plugin.apply({ get: () => ({ overrideTokens: () => () => {} }),
    slots: { inject: (_slot, factory) => factory(), register: options => { view = options; } },
    on: (_event, fn) => { dispose = fn; } });
  return { intervals, requests, helpers, attributes, view, get events() { return events; }, get closed() { return closed; }, dispose };
}

test('Desktop registers the renamed settings entry and polls without SSE', () => {
  const h = harness();
  assert.deepEqual(h.intervals, [1000]); assert.equal(h.events, 0);
  assert.equal(h.view.id, 'wallpaper-skin'); assert.equal(h.view.label, 'DSH 壁纸桥');
  assert.deepEqual(h.requests, ['/we-skin/state', '/we-skin/config', '/we-skin/health']);
  h.dispose();
});

test('Web keeps SSE plus safety polling and closes it on dispose', () => {
  const h = harness('https:');
  assert.deepEqual(h.intervals, [2500]); assert.equal(h.events, 1);
  h.dispose(); assert.equal(h.closed, 1);
});

test('Desktop media uses only the advertised loopback origin, never a remote host', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const base = new URL('https://example.invalid'); base.hostname = host; base.port = '43210';
    const h = harness('dsh-app:', base.href);
    assert.equal(h.helpers.desktopMediaUrl('/we-skin/web/demo.mp4'), new URL('/we-skin/web/demo.mp4', base).href);
    h.dispose();
  }
  for (const base of [undefined, 'https://example.invalid', 'file:///tmp/demo', 'not a URL']) {
    const h = harness('dsh-app:', base); assert.equal(h.helpers.desktopMediaUrl('/we-skin/art'), '/we-skin/art'); h.dispose();
  }
});

test('web wallpaper cannot share DSH origin or send a referrer', () => {
  const h = harness(); const frame = h.helpers.createMedia({ type: 'web', entry: 'index.html' }, { fit: 'cover', zoom: 1, positionX: 50, positionY: 50 });
  assert.equal(h.attributes.get('iframe:sandbox'), 'allow-scripts');
  assert.equal(frame.referrerPolicy, 'no-referrer');
  assert.equal(frame.src, '/we-skin/web/index.html'); h.dispose();
});

test('scene preview fallback is static and per-wallpaper settings remain isolated', () => {
  const h = harness(), config = { fit: 'cover', perWallpaper: { one: { zoom: 2, fit: 'native' } } };
  const saved = h.helpers.effectiveConfig(config, { id: 'one', type: 'scene', art: false });
  const fallback = h.helpers.effectiveConfig(config, { id: 'two', type: 'scene', art: false });
  assert.equal(saved.zoom, 2); assert.equal(saved.fit, 'native');
  assert.equal(fallback.zoom, 1); assert.equal(fallback.fit, 'contain'); h.dispose();
});
