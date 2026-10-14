import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { VERSION } from './config.js';

const hash = value => createHash('sha256').update(value).digest('hex');
export async function installTavernExtension(directory) {
  const components = ['public', 'scripts', 'extensions', 'third-party', 'dsh-tavern-bridge'];
  let target = path.resolve(directory);
  // Do not follow an extension-directory symlink outside the authorized install.
  for (const component of components) {
    target = path.join(target, component);
    try { const stat = await fs.lstat(target); if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Unsafe extension directory'); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('酒馆扩展目录不可写或为链接 / Unsafe Tavern extension directory'); await fs.mkdir(target); }
  }
  const code = await fs.readFile(new URL('./tavern-extension.js', import.meta.url), 'utf8');
  const manifest = JSON.stringify({ display_name: 'DSH Tavern Bridge', loading_order: 1, requires: [], optional: [], js: 'index.js', author: 'DSH Tavern Bridge contributors', version: VERSION, dsh_bridge_code_sha256: hash(code) }, null, 2) + '\n';
  const entries = [['index.js', code], ['manifest.json', manifest]], originals = new Map();
  for (const [name] of entries) {
    const file = path.join(target, name);
    try { if (!(await fs.lstat(file)).isFile() || (await fs.lstat(file)).isSymbolicLink()) throw new Error('Unsafe extension file'); originals.set(name, await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('酒馆扩展文件不安全 / Unsafe Tavern extension file'); originals.set(name, null); }
  }
  if (originals.get('index.js') !== null || originals.get('manifest.json') !== null) {
    let previous;
    try { previous = JSON.parse(originals.get('manifest.json')); } catch { /* refuse unknown files */ }
    if (!previous?.dsh_bridge_code_sha256 || originals.get('index.js') === null || hash(originals.get('index.js')) !== previous.dsh_bridge_code_sha256) throw new Error('已有同名扩展或本地改动；不会覆盖 / Existing extension or local edits will not be overwritten');
  }
  const written = [];
  try { for (const [name, value] of entries) {
    const before = originals.get(name);
    if (before === value) continue;
    const file = path.join(target, name), temporary = file + '.' + randomUUID() + '.tmp';
    if (before !== null) await fs.writeFile(file + '.' + randomUUID() + '.bak', before, { flag: 'wx', mode: 0o600 });
    try {
      await fs.writeFile(temporary, value, { flag: 'wx', mode: 0o600 });
      let current = null;
      try { current = await fs.readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (current !== before) throw new Error('Extension changed concurrently');
      await fs.rename(temporary, file);
      written.push([name, value]);
    } finally { await fs.rm(temporary, { force: true }); }
  } } catch (error) {
    // Roll back only our unchanged writes, preserving any competing edits.
    for (const [name, value] of written.reverse()) {
      const file = path.join(target, name);
      if (await fs.readFile(file, 'utf8').catch(() => null) !== value) continue;
      const before = originals.get(name);
      if (before === null) await fs.rm(file);
      else {
        const temporary = file + '.' + randomUUID() + '.tmp';
        try { await fs.writeFile(temporary, before, { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, file); }
        finally { await fs.rm(temporary, { force: true }); }
      }
    }
    throw error;
  }
}
