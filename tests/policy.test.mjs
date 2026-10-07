import test from 'node:test';
import assert from 'node:assert/strict';
import { sensitiveFindings, allowedPublicPath, documentationIssues, needsVersionBump } from '../scripts/policy.mjs';

test('plugin edits require both root READMEs and both plugin READMEs plus changelog', () => {
  const changed = ['plugins/example/lib/client.js'];
  assert.equal(documentationIssues(changed).length, 5);
  changed.push('README.md', 'README.en.md', 'plugins/example/README.md', 'plugins/example/README.en.md', 'plugins/example/CHANGELOG.md');
  assert.deepEqual(documentationIssues(changed), []);
  assert.ok(documentationIssues(changed.filter(name => name !== 'README.en.md')).length);
});
test('each changed plugin gets its own documentation check', () => {
  const changed = ['README.md', 'README.en.md', 'plugins/one/lib/index.js', 'plugins/two/lib/index.js'];
  assert.equal(documentationIssues(changed).length, 6);
  assert.equal(documentationIssues(['scripts/check.mjs']).length, 0);
});
test('plugin-specific tests are also treated as plugin updates', () => {
  assert.equal(documentationIssues(['tests/example/client.test.mjs']).length, 5);
});
test('private data, unknown binaries and archives are excluded by the public file allowlist', () => {
  for (const name of ['testing/bootstrap.log', 'plugins/example/.env', 'plugins/example/credentials.json', 'plugins/example/a.tgz', 'plugins/example/portrait.png', 'plugins/example/node_modules/x.js', 'sessions/private.jsonl']) assert.equal(allowedPublicPath(name), false, name);
  for (const name of ['README.md', 'plugins/example/lib/index.js', 'plugins/example/lib/index.d.ts', 'tests/example/transport.test.mjs', '.github/workflows/check.yml']) assert.equal(allowedPublicPath(name), true, name);
});
test('sensitive matches expose category and line, never the matched secret', () => {
  const token = ['gh', 'p_', 'A'.repeat(30)].join('');
  const homePath = ['X:', 'Users', 'synthetic-user', 'private'].join(String.fromCharCode(92));
  const id = ['session-', '0'.repeat(8), '-', '0'.repeat(4), '-', '0'.repeat(4), '-', '0'.repeat(4), '-', '0'.repeat(12)].join('');
  const findings = sensitiveFindings(`safe\n${token}\n${homePath}\n${id}`);
  assert.equal(findings.length, 3); assert.ok(findings.every(f => Object.keys(f).sort().join(',') === 'category,line'));
  assert.ok(!JSON.stringify(findings).includes(token));
});
test('metadata and runtime updates bump versions; documentation-only edits do not', () => {
  for (const suffix of ['lib/client.js', 'lib/index.js', 'cordis.patch.yml', 'package.json']) assert.equal(needsVersionBump('example', ['plugins/example/' + suffix]), true);
  assert.equal(needsVersionBump('example', ['plugins/example/README.md']), false);
});
