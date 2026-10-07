// Inspect locally built npm archives without extracting files or running hooks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { allowedPublicPath, sensitiveFindings } from './policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [slug, archive] = process.argv.slice(2);
assert.ok(/^[a-z0-9-]+$/.test(slug || '') && archive, 'Usage: node scripts/inspect-package.mjs <plugin-slug> <archive.tgz>');
const pluginRoot = path.join(root, 'plugins', slug);
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
const expected = new Set(['package.json', ...manifest.files]), seen = new Set();
const tar = gunzipSync(fs.readFileSync(archive));
const field = (buffer, start, length) => buffer.subarray(start, start + length).toString().replace(/\0.*$/s, '');
let offset = 0;
while (offset + 512 <= tar.length) {
  const header = tar.subarray(offset, offset + 512); offset += 512;
  if (header.every(byte => byte === 0)) break;
  const prefix = field(header, 345, 155), filename = field(header, 0, 100);
  const full = prefix ? `${prefix}/${filename}` : filename;
  const size = Number.parseInt(field(header, 124, 12).trim(), 8), type = header[156];
  assert.ok(Number.isSafeInteger(size) && size >= 0 && offset + size <= tar.length, 'Invalid archive size');
  assert.ok(type === 0 || type === 48, 'Only regular files are publishable');
  assert.ok(full.startsWith('package/'), 'Unexpected archive prefix');
  const name = full.slice('package/'.length);
  assert.ok(expected.has(name) && !seen.has(name), 'Unexpected or duplicate package file');
  assert.ok(allowedPublicPath(`plugins/${slug}/${name}`), 'File outside public allowlist');
  const bytes = tar.subarray(offset, offset + size);
  assert.ok(bytes.equals(fs.readFileSync(path.join(pluginRoot, name))), 'Archive differs from public source');
  assert.deepEqual(sensitiveFindings(bytes.toString('utf8')), [], 'Sensitive pattern detected (values omitted)');
  seen.add(name); offset += Math.ceil(size / 512) * 512;
}
assert.deepEqual([...seen].sort(), [...expected].sort(), 'Missing package files');
console.log(`PACKAGE_CHECK_PASS: ${slug} ${manifest.version}; ${seen.size} exact source files; no dependencies, private files or symlinks`);
