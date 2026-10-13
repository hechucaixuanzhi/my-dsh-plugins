import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { modelCatalog, toDshRequest } from '../../plugins/sillytavern-bridge/lib/gateway.js';

if (!process.env.DSH_ASAR) {
  test('installed DSH Tavern Bridge contract suite', { skip: 'Set DSH_ASAR to inspect an installed archive; this is NOT native acceptance' }, () => {});
} else {
  function readArchive(name) {
    const fd = fs.openSync(process.env.DSH_ASAR, 'r');
    try {
      const prefix = Buffer.alloc(16); fs.readSync(fd, prefix, 0, 16, 0);
      const bytes = Buffer.alloc(prefix.readUInt32LE(12)); fs.readSync(fd, bytes, 0, bytes.length, 16);
      let entry = JSON.parse(bytes.toString()); for (const part of name.split('/')) entry = entry.files[part];
      const data = Buffer.alloc(entry.size); fs.readSync(fd, data, 0, data.length, 8 + prefix.readUInt32LE(4) + Number(entry.offset)); return data.toString();
    } finally { fs.closeSync(fd); }
  }
  const source = readArchive('dsh/node_modules/@deepseek-ai/dsh-llm/lib/index.js');
  function method(name) {
    // Load the exact installed public method, not a remembered TypeScript copy.
    // Only these small methods execute; adapters and credentials stay synthetic.
    const expression = new RegExp('^\\t\\t(?:async )?' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^\\t\\t\\}', 'm');
    const found = expression.exec(source); assert.ok(!!found, 'Installed service method not found: ' + name);
    return vm.runInNewContext('({' + found[0] + '})', { LlmError: class extends Error {} })[name];
  }
  test('installed versions match the declared Desktop target and prerequisite model service', () => {
    assert.equal(JSON.parse(readArchive('dsh/package.json')).version, '0.2.0-rc.2');
    assert.equal(JSON.parse(readArchive('dsh/node_modules/@deepseek-ai/dsh-llm/package.json')).version, '0.2.0-rc.2');
  });
  test('catalog mapping runs the real installed listProviders and listModels methods with synthetic registrations', async () => {
    const adapter = { listModels: async () => [{ provider: 'fixture', id: 'text', name: 'Fixture' }] };
    const service = { adapters: new Map([['fixture', { provider: { id: 'fixture', name: 'Fixture' }, adapter }]]),
      registration(provider) { return this.adapters.get(provider); }, detachedModalities: value => value,
      listProviders: method('listProviders'), listModels: method('listModels') };
    const rows = await modelCatalog(service); assert.equal(rows.length, 1); assert.equal(rows[0].id, 'fixture/text');
    adapter.listModels = async () => [{ provider: 'wrong', id: 'text', name: 'Fixture' }];
    await assert.rejects(modelCatalog(service));
  });
  test('converted requests pass the installed stream entry and waterfall without reading secrets or making network requests', async () => {
    let observed;
    const service = { stream: method('stream'), streamWithRegistration: method('streamWithRegistration'),
      ctx: { waterfall: (_owner, event, options, next) => { assert.equal(event, 'llm/stream'); observed = options; return next(); } },
      async *adapterStream() { yield { type: 'text-delta', index: 0, text: 'synthetic' }; yield { type: 'finish', reason: { kind: 'stop' } }; } };
    const options = toDshRequest({ model: 'fixture/text', messages: [{ role: 'user', content: 'synthetic' }] });
    const chunks = []; for await (const chunk of service.stream(options)) chunks.push(chunk);
    assert.equal(observed, options); assert.equal(chunks[0].text, 'synthetic');
  });
  test('installed Desktop carrier still supplies the right-pane browser and settings slots', () => {
    const right = readArchive('dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar-right/lib/client.js');
    const browser = readArchive('dsh/node_modules/@deepseek-ai/dsh-client-ui-sidebar-browser/lib/client.js');
    assert.ok(right.includes('sidebar.right.pane.tab') && right.includes('openTab'));
    assert.ok(browser.includes('browser'));
  });
}
