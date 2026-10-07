// Release checks detect common leaks; they are not a complete secret detector.
const sensitivePatterns = [
  ['personal-home-path', /(?:[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s<>"']+|\/(?:home|Users)\/[A-Za-z0-9_.-]+\/)/g],
  ['private-session-id', /\bsession-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ['provider-key', /\bsk-[A-Za-z0-9_-]{16,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['personal-mailbox', /\b[A-Za-z0-9._%+-]+@(?:gmail|qq|outlook|hotmail|163|126)\.com\b/gi],
  ['credential-value', /(?:["']?(?:api[_-]?key|access[_-]?token|password|cookie|authorization)["']?\s*[:=]\s*)["'][^"'\n<>]{12,}["']/gi],
  ['credential-url', /https?:\/\/[^\s/@:]+:[^\s/@]+@[^\s/]+/gi],
  ['private-network-url', /https?:\/\/(?:127\.\d+\.\d+\.\d+|localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(?::\d+)?\b/gi],
];

export function sensitiveFindings(text) {
  const findings = [];
  for (const [category, pattern] of sensitivePatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({ category, line: text.slice(0, match.index).split('\n').length });
    }
  }
  return findings; // Never return or print matched values.
}

const rootFiles = new Set(['README.md', 'README.en.md', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md', 'LICENSE', 'package.json', '.gitignore', '.gitattributes']);
export function allowedPublicPath(path) {
  if (rootFiles.has(path)) return true;
  if (/(?:^|\/)(?:node_modules|dist|testing|backups|logs|sessions|credentials|profiles|\.dsh|\.codex)(?:\/|$)/i.test(path)) return false;
  return /^plugins\/[a-z0-9-]+\/(?:package\.json|cordis\.patch\.yml|README(?:\.en)?\.md|CHANGELOG\.md|LICENSE|NOTICE\.md|lib\/[A-Za-z0-9_.-]+\.(?:js|d\.ts))$/.test(path)
    || /^tests\/(?:[a-z0-9-]+\/)?[A-Za-z0-9_.-]+\.mjs$/.test(path)
    || /^scripts\/[A-Za-z0-9_.-]+\.mjs$/.test(path)
    || /^docs\/release-checks\/[a-z0-9-]+\.md$/.test(path)
    || path === '.github/workflows/check.yml';
}

export function documentationIssues(changed) {
  const paths = new Set(changed);
  const slugs = new Set(changed.map(path => /^(?:plugins|tests)\/([a-z0-9-]+)\//.exec(path)?.[1]).filter(Boolean));
  const issues = [];
  for (const slug of slugs) {
    for (const required of ['README.md', 'README.en.md', `plugins/${slug}/README.md`, `plugins/${slug}/README.en.md`, `plugins/${slug}/CHANGELOG.md`]) {
      if (!paths.has(required)) issues.push(`${slug}: missing synchronized update to ${required}`);
    }
  }
  return issues;
}

export function needsVersionBump(slug, changed) {
  return changed.some(path => path === `plugins/${slug}/package.json` || path === `plugins/${slug}/cordis.patch.yml` || path.startsWith(`plugins/${slug}/lib/`));
}
