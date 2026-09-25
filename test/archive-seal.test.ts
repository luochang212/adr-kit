import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { archiveCommand } from '../src/commands/archive.js';
import { recordCommand } from '../src/commands/record.js';
import { supersedeCommand } from '../src/commands/supersede.js';
import { validateCommand } from '../src/commands/validate.js';
import {
  appendSeal,
  ARCHIVED_DIR,
  emptyArchiveManifest,
  MANIFEST_FILE,
  parseArchiveManifest,
  readArchiveManifest,
  sealBytes,
  writeArchiveManifest,
} from '../src/core/archive-seal.js';
import { initRepository, listRecords } from '../src/core/repository.js';
import { validateRepository, validateRepositoryWithBase } from '../src/core/validate.js';

const roots: string[] = [];

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'adrkit-seal-'));
  roots.push(root);
  initRepository(root);
  return root;
}

function manifestPath(root: string): string {
  return join(root, 'adr', ARCHIVED_DIR, MANIFEST_FILE);
}

function fillDecision(root: string, number: number): void {
  const record = listRecords(root).find((candidate) => candidate.number === number);
  if (record === undefined) throw new Error('decision missing');
  const content = readFileSync(record.path, 'utf8')
    .replace('<!-- What problem or opportunity does this decision address? -->', 'Storage must survive restarts.')
    .replace('<!-- The decision that shipped, in present tense. -->', 'Use SQLite.')
    .replace(/<!-- Each genuine alternative and why it lost\. Keep this section: it is the\n     part of a decision record that prevents re-litigating old choices\. -->/, 'JSON files complicate queries.')
    .replace('<!-- What the trade-off cost and bought. -->', 'Local persistence requires packaging SQLite.');
  writeFileSync(record.path, content);
}

function git(root: string, ...args: string[]): string {
  return execFileSync(
    'git',
    ['-c', 'user.email=adrkit@example.com', '-c', 'user.name=adrkit test', ...args],
    { cwd: root, encoding: 'utf8' },
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (existsSync(manifestPath(root))) chmodSync(manifestPath(root), 0o644);
    rmSync(root, { recursive: true, force: true });
  }
});

/** A repository that also has a real git checkout for base-aware checks. */
function gitRepo(): string {
  const root = repo();
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

describe('archive manifest parsing', () => {
  it('round-trips an empty manifest written by init', () => {
    const root = repo();
    expect(readArchiveManifest(root)).toEqual({ version: 1, entries: [] });
  });

  it('parses seals and refuses malformed manifests', () => {
    const manifest = parseArchiveManifest(
      JSON.stringify({ version: 1, entries: [{ path: '5-old-choice.md', sha256: sealBytes('x') }] }),
      'MANIFEST.json',
    );
    expect(manifest.entries).toHaveLength(1);
    expect(() => parseArchiveManifest('{not json', 'MANIFEST.json')).toThrow(/not valid JSON/);
    expect(() => parseArchiveManifest('[]', 'MANIFEST.json')).toThrow(/must be a JSON object/);
    expect(() => parseArchiveManifest(JSON.stringify({ entries: [] }), 'MANIFEST.json')).toThrow(/version/);
    expect(() => parseArchiveManifest(JSON.stringify({ version: 2, entries: [] }), 'MANIFEST.json')).toThrow(/version/);
    expect(() => parseArchiveManifest(JSON.stringify({ version: 1 }), 'MANIFEST.json')).toThrow(/entries/);
    expect(() => parseArchiveManifest(JSON.stringify({ version: 1, entries: ['x'] }), 'MANIFEST.json')).toThrow(/objects/);
    expect(() =>
      parseArchiveManifest(JSON.stringify({ version: 1, entries: [{ path: '../etc/passwd', sha256: sealBytes('x') }] }), 'M'),
    ).toThrow(/N-slug\.md/);
    expect(() =>
      parseArchiveManifest(JSON.stringify({ version: 1, entries: [{ path: '5-old.md', sha256: 'nothex' }] }), 'M'),
    ).toThrow(/SHA-256/);
    expect(() =>
      parseArchiveManifest(
        JSON.stringify({
          version: 1,
          entries: [
            { path: '5-old.md', sha256: sealBytes('x') },
            { path: '5-old.md', sha256: sealBytes('y') },
          ],
        }),
        'M',
      ),
    ).toThrow(/more than once/);
  });

  it('refuses a second seal for the same file', () => {
    const manifest = appendSeal(emptyArchiveManifest(), '5-old.md', sealBytes('x'));
    expect(() => appendSeal(manifest, '5-old.md', sealBytes('y'))).toThrow(/already seals/);
  });
});

describe('archive and supersede append seals', () => {
  it('seals an archived record and passes validation', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Current behavior lives elsewhere', root);
    const manifest = readArchiveManifest(root)!;
    expect(manifest.entries.map((entry) => entry.path)).toEqual(['1-use-sqlite.md']);
    const bytes = readFileSync(join(root, 'adr', 'archived', '1-use-sqlite.md'));
    expect(manifest.entries[0]!.sha256).toBe(sealBytes(bytes));
    expect(validateRepository(root)).toEqual([]);
  });

  it('seals a superseded record and passes validation', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    recordCommand('Use Postgres', root, 'human', 'human');
    fillDecision(root, 2);
    supersedeCommand('1', '2', root);
    const manifest = readArchiveManifest(root)!;
    expect(manifest.entries.map((entry) => entry.path)).toEqual(['1-use-sqlite.md']);
    expect(validateRepository(root)).toEqual([]);
  });

  it('refuses to archive without a manifest and leaves the source in place', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    rmSync(manifestPath(root));
    expect(() => archiveCommand('1', 'Retired', root)).toThrow(/manifest must exist/);
    const implemented = listRecords(root).find((candidate) => candidate.number === 1);
    expect(implemented?.folder).toBe('implemented');
    expect(existsSync(join(root, 'adr', 'archived', '1-use-sqlite.md'))).toBe(false);
  });

  it('refuses to archive a decision the manifest already seals', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    // Pre-seal the target name so the duplicate check fires before staging.
    writeArchiveManifest(root, { version: 1, entries: [{ path: '1-use-sqlite.md', sha256: sealBytes('x') }] });
    expect(() => archiveCommand('1', 'Retired', root)).toThrow(/already seals/);
    expect(listRecords(root).find((record) => record.number === 1)?.folder).toBe('implemented');
    expect(existsSync(join(root, 'adr', 'archived', '1-use-sqlite.md'))).toBe(false);
  });

  it('rolls the staged archived file back when the seal cannot be written', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    chmodSync(manifestPath(root), 0o444);
    try {
      expect(() => archiveCommand('1', 'Retired', root)).toThrow();
      expect(existsSync(join(root, 'adr', 'archived', '1-use-sqlite.md'))).toBe(false);
      const implemented = listRecords(root).find((candidate) => candidate.number === 1);
      expect(implemented?.folder).toBe('implemented');
    } finally {
      chmodSync(manifestPath(root), 0o644);
    }
  });

  it('refuses to archive a decision that does not validate', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    expect(() => archiveCommand('1', 'Retired', root)).toThrow(/not valid/);
    expect(listRecords(root).find((record) => record.number === 1)?.folder).toBe('implemented');
    expect(readArchiveManifest(root)!.entries).toEqual([]);
  });

  it('refuses to supersede a decision that does not validate', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    recordCommand('Use Postgres', root, 'human', 'human');
    fillDecision(root, 2);
    expect(() => supersedeCommand('1', '2', root)).toThrow(/not valid/);
    expect(listRecords(root).find((record) => record.number === 1)?.folder).toBe('implemented');
  });

  it('refuses a new archive when a prior seal has drifted', () => {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    recordCommand('Use Postgres', root, 'human', 'human');
    fillDecision(root, 2);
    const sealed = join(root, 'adr', 'archived', '1-use-sqlite.md');
    writeFileSync(sealed, `${readFileSync(sealed, 'utf8')}\nEDITED\n`);
    expect(() => archiveCommand('2', 'Retired too', root)).toThrow(/inconsistent/);
    expect(listRecords(root).find((record) => record.number === 2)?.folder).toBe('implemented');
  });
});

describe('validate detects archive drift', () => {
  function sealedRepo(): string {
    const root = repo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    return root;
  }

  it('reports edited archived bytes', () => {
    const root = sealedRepo();
    const path = join(root, 'adr', 'archived', '1-use-sqlite.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('Use SQLite.', 'Use SQLite for durability.'));
    const issues = validateRepository(root);
    expect(issues.some((issue) => issue.path.endsWith('1-use-sqlite.md') && /no longer match/.test(issue.message))).toBe(true);
    expect(validateCommand(root, '1').valid).toBe(false);
  });

  it('reports an unsealed archived file', () => {
    const root = sealedRepo();
    writeArchiveManifest(root, { version: 1, entries: [] });
    const issues = validateRepository(root);
    expect(issues.some((issue) => issue.path.endsWith('1-use-sqlite.md') && /no seal/.test(issue.message))).toBe(true);
  });

  it('reports a missing manifest even when the archive is empty', () => {
    const root = repo();
    rmSync(manifestPath(root));
    const issues = validateRepository(root);
    expect(issues.some((issue) => issue.path === 'adr/archived/MANIFEST.json' && /missing/.test(issue.message))).toBe(true);
  });

  it('reports a seal whose file is missing and an extra seal', () => {
    const root = sealedRepo();
    rmSync(join(root, 'adr', 'archived', '1-use-sqlite.md'));
    const issues = validateRepository(root);
    expect(issues.some((issue) => /does not exist in archived\//.test(issue.message))).toBe(true);
  });

  it('reports a malformed manifest', () => {
    const root = sealedRepo();
    writeFileSync(manifestPath(root), '{oops');
    const issues = validateRepository(root);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.path).toBe('adr/archived/MANIFEST.json');
    expect(issues[0]!.message).toMatch(/not valid JSON/);
  });

  it('passes for a non-git repository when files and seals agree', () => {
    const root = sealedRepo();
    expect(validateRepository(root)).toEqual([]);
    expect(validateCommand(root, '1').output).toBe('adr/archived/1-use-sqlite.md: OK');
  });
});

describe('base-aware validation enforces append-only history', () => {
  it('accepts a newly appended archive after the base', () => {
    const root = gitRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base');
    recordCommand('Use Postgres', root, 'human', 'human');
    fillDecision(root, 2);
    archiveCommand('1', 'Replaced by Postgres', root);
    expect(validateRepositoryWithBase(root, 'HEAD')).toEqual([]);
  });

  it('fails when an archived file and its hash are rewritten together', () => {
    const root = gitRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base');
    // Coordinated edit: current-tree checks agree, history does not.
    const path = join(root, 'adr', 'archived', '1-use-sqlite.md');
    const content = readFileSync(path, 'utf8').replace('Use SQLite.', 'Use SQLite forever.');
    writeFileSync(path, content);
    const manifest = readArchiveManifest(root)!;
    manifest.entries[0]!.sha256 = sealBytes(content);
    writeArchiveManifest(root, manifest);
    expect(validateRepository(root)).toEqual([]);
    const issues = validateRepositoryWithBase(root, 'HEAD');
    expect(issues.some((issue) => /changed after HEAD/.test(issue.message))).toBe(true);
  });

  it('fails when a prior seal is deleted or reordered', () => {
    const root = gitRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base');
    writeArchiveManifest(root, { version: 1, entries: [] });
    const issues = validateRepositoryWithBase(root, 'HEAD');
    expect(issues.length).toBeGreaterThan(0);
  });

  it('fails with an actionable error for an unreadable base ref', () => {
    const root = gitRepo();
    const issues = validateRepositoryWithBase(root, 'no-such-ref');
    expect(issues.some((issue) => /git base "no-such-ref" cannot be read/.test(issue.message))).toBe(true);
  });

  it('treats a base without a manifest as having no prior seals', () => {
    const root = gitRepo();
    rmSync(manifestPath(root));
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base without manifest');
    // The archive command requires a manifest to append to, so the current
    // tree gets a fresh one; the base ref itself still has no seals.
    writeArchiveManifest(root, emptyArchiveManifest());
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    expect(validateRepositoryWithBase(root, 'HEAD')).toEqual([]);
  });

  it('rejects --base together with single-record validation', () => {
    const root = repo();
    expect(() => validateCommand(root, '1', 'HEAD')).toThrow(/repository-wide/);
  });

  it('reports a malformed current manifest instead of throwing under --base', () => {
    const root = gitRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base');
    writeFileSync(manifestPath(root), '{oops');
    const issues = validateRepositoryWithBase(root, 'HEAD');
    expect(issues.some((issue) => /not valid JSON/.test(issue.message))).toBe(true);
  });

  it('fails when the base manifest exists but its content cannot be read', () => {
    const root = gitRepo();
    recordCommand('Use SQLite', root, 'human', 'human');
    fillDecision(root, 1);
    archiveCommand('1', 'Retired', root);
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'base');
    // Drop the loose blob so `git show <ref>:path` fails while the tree entry
    // still resolves: the state a partial clone produces.
    const blob = execFileSync('git', ['rev-parse', 'HEAD:adr/archived/MANIFEST.json'], { cwd: root, encoding: 'utf8' }).trim();
    rmSync(join(root, '.git', 'objects', blob.slice(0, 2), blob.slice(2)));
    const issues = validateRepositoryWithBase(root, 'HEAD');
    expect(issues.some((issue) => /exists but cannot be read/.test(issue.message))).toBe(true);
  });
});
