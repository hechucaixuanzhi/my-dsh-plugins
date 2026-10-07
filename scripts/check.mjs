import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { allowedPublicPath, sensitiveFindings, documentationIssues, needsVersionBump } from './policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const staged = process.argv.includes('--staged');
const git = (args, options = {}) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
const read = name => staged ? git(['show', `:${name}`]) : fs.readFileSync(path.join(root, name), 'utf8');
const files = (staged ? git(['ls-files', '--cached', '-z']) : git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
const issues = [], unique = [...new Set(files)];
for (const name of unique) {
  if (!allowedPublicPath(name)) { issues.push(`${name}: file is outside the public allowlist`); continue; }
  if (!staged && (!fs.existsSync(path.join(root, name)) || fs.lstatSync(path.join(root, name)).isSymbolicLink())) { issues.push(`${name}: missing file or symlink is not publishable`); continue; }
  const text = read(name);
  if (text.includes('\0') || Buffer.byteLength(text) > 250000) issues.push(`${name}: non-text or unexpectedly large file`);
  for (const finding of sensitiveFindings(text)) issues.push(`${name}:${finding.line}: ${finding.category}`);
}
if (git(['ls-files', '--stage']).split('\n').some(line => line.startsWith('120000 '))) issues.push('Tracked symlinks are not publishable');
// Stop before JSON/syntax diagnostics can accidentally echo sensitive input.
if (issues.length) { console.error(issues.join('\n')); console.error('PUBLIC_CHECK_FAILED (findings omit secret values)'); process.exit(1); }

let base = process.env.CHECK_BASE;
if (base && !/^[0-9a-f]{40,64}$/i.test(base)) throw new Error('CHECK_BASE must be a Git object ID');
if (base && /^0+$/.test(base)) base = undefined;
if (!base) { try { base = git(['rev-parse', '--verify', 'HEAD']).trim(); } catch { /* first commit */ } }
if (!base) base = git(['hash-object', '-t', 'tree', '--stdin'], { input: '' }).trim();
const changed = git(['diff', ...(staged ? ['--cached'] : []), '--name-only', '-z', base, '--']).split('\0').filter(Boolean);
if (!staged) changed.push(...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean));
issues.push(...documentationIssues(changed));

const manifests = unique.filter(name => /^plugins\/[a-z0-9-]+\/package\.json$/.test(name));
if (!manifests.length) issues.push('No standalone plugin manifest found');
for (const name of manifests) {
  const slug = name.split('/')[1], prefix = `plugins/${slug}/`;
  let pkg; try { pkg = JSON.parse(read(name)); } catch { issues.push(`${name}: invalid JSON (contents omitted)`); continue; }
  const required = ['README.md', 'README.en.md', 'CHANGELOG.md', 'LICENSE', 'NOTICE.md', 'cordis.patch.yml'];
  for (const file of required) if (!unique.includes(prefix + file)) issues.push(`${prefix}${file}: required public file missing`);
  if (!pkg.dsh?.bundle?.patch || pkg.dsh.client?.platform !== 'web' || !pkg.exports?.['./client']) issues.push(`${name}: missing DSH Bundle/client declarations`);
  if (pkg.license !== 'MIT') issues.push(`${name}: review and update license policy before adding differently licensed work`);
  const version = pkg.version, compatible = pkg.peerDependencies?.['@deepseek-ai/dsh'];
  for (const doc of ['README.md', 'README.en.md', prefix + 'README.md', prefix + 'README.en.md']) {
    if (!read(doc).includes(version) || !compatible || !read(doc).includes(compatible)) issues.push(`${doc}: missing current version or compatibility for ${slug}`);
    if (!doc.startsWith('plugins/')) {
      const row = read(doc).split('\n').find(line => line.startsWith('|') && line.includes(prefix + 'README'));
      if (!row || !row.includes(version) || !row.includes(compatible)) issues.push(`${doc}: plugin catalog row is missing or stale for ${slug}`);
    }
  }
  if (!read(prefix + 'CHANGELOG.md').includes(version)) issues.push(`${prefix}CHANGELOG.md: current version missing`);
  if (!Array.isArray(pkg.files) || pkg.files.some(file => /[*?]/.test(file) || !unique.includes(prefix + file))) issues.push(`${name}: package files must use an existing explicit allowlist`);
  if (pkg.scripts && Object.keys(pkg.scripts).some(key => /^(?:preinstall|install|postinstall|prepare|prepack|postpack)$/.test(key))) issues.push(`${name}: lifecycle scripts need separate security review`);
  if (needsVersionBump(slug, changed)) {
    let before; try { before = JSON.parse(git(['show', `${base}:${name}`])); } catch { /* new plugin */ }
    if (before?.version === version) issues.push(`${name}: runtime/manifest changes require a version bump`);
  }
  for (const file of [pkg.main, 'lib/client.js']) {
    if (file && unique.includes(prefix + file)) {
      try { execFileSync(process.execPath, ['--check', ...(staged ? ['--input-type=module', '-'] : [path.join(root, prefix, file)])],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...(staged ? { input: read(prefix + file) } : {}) }); }
      catch { issues.push(`${prefix}${file}: JavaScript syntax check failed (source omitted)`); }
    }
  }
}
if (issues.length) {
  console.error(issues.join('\n')); console.error('PUBLIC_CHECK_FAILED (findings omit secret values)'); process.exitCode = 1;
} else console.log(`PUBLIC_CHECK_PASS: ${unique.length} text files; ${manifests.length} standalone plugin(s); bilingual README gate; ${staged ? 'staged' : 'worktree'} scope`);
