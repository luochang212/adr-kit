import * as fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initRepository } from '../src/core/repository.js';
import { readArchiveManifest } from '../src/core/archive-seal.js';
import { writtenHeadings } from '../src/core/adr.js';
import { archiveCommand } from '../src/commands/archive.js';
import { implementCommand } from '../src/commands/implement.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { relevantCommand } from '../src/commands/relevant.js';
import { validateCommand } from '../src/commands/validate.js';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof fs>();
  return { ...original, writeFileSync: vi.fn(original.writeFileSync), readFileSync: vi.fn(original.readFileSync),
    renameSync: vi.fn(original.renameSync), readdirSync: vi.fn(original.readdirSync) };
});
const actualFs = await vi.importActual<typeof fs>('node:fs');
const roots: string[] = [];
function repo(): string {
  const root = fs.mkdtempSync(join(tmpdir(), 'adrkit-review-'));
  roots.push(root); initRepository(root); return root;
}
const decision = (n: number, scope?: string) => `---\nstatus: implemented\ndate: 2026-10-20\nraised-by: human\ndecided-by: human\ncreated: 2026-10-20\n${scope ? `paths: [${JSON.stringify(scope)}]\n` : ''}---\n\n# ADR: ${n} Choice\n\n## Problem\nStorage.\n\n## Decision\nUse SQLite.\n\n## Alternatives considered\nJSON.\n\n## Consequences\nLocal files.\n`;
const proposal = (extra = '') => `---\nstatus: proposed\ndate: 2026-10-20\ncreated: 2026-10-20\n---\n\n# ADR: Choice\n\n## Problem\nStorage.\n\n## Proposal\nUse SQLite.\n\n## Alternatives considered\nJSON.\n\n## Acceptance criteria\n\n## Risks\n\n${extra}`;
function putDecision(root: string, n: number, scope?: string): string {
  const path = join(root, `adr/implemented/${n}-choice.md`);
  fs.writeFileSync(path, decision(n, scope)); return path;
}
function putProposal(root: string, extra = ''): string {
  const path = join(root, 'adr/proposed/2026-10-20-choice.md');
  fs.writeFileSync(path, proposal(extra)); return path;
}
afterEach(() => {
  vi.mocked(fs.writeFileSync).mockReset().mockImplementation(actualFs.writeFileSync);
  vi.mocked(fs.readFileSync).mockReset().mockImplementation(actualFs.readFileSync);
  vi.mocked(fs.renameSync).mockReset().mockImplementation(actualFs.renameSync);
  vi.mocked(fs.readdirSync).mockReset().mockImplementation(actualFs.readdirSync);
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('archive failure boundaries', () => {
  it.each(['partial write', 'rename'])('preserves existing seals on a %s failure', (failure) => {
    const root = repo(); putDecision(root, 1); archiveCommand('1', 'Retired', root);
    const source = putDecision(root, 2);
    const sourceBytes = fs.readFileSync(source, 'utf8');
    const manifest = join(root, 'adr/archived/MANIFEST.json');
    const original = fs.readFileSync(manifest, 'utf8');
    if (failure === 'partial write') {
      vi.mocked(fs.writeFileSync).mockImplementation((path, data, ...args) => {
        if (String(path).includes('MANIFEST')) {
          actualFs.writeFileSync(path, String(data).slice(0, 30));
          throw new Error('ENOSPC after partial write');
        }
        return actualFs.writeFileSync(path, data, ...args);
      });
    } else {
      vi.mocked(fs.renameSync).mockImplementation(() => { throw new Error('rename denied'); });
    }
    expect(() => archiveCommand('2', 'Retired', root)).toThrow();
    expect(fs.readFileSync(manifest, 'utf8')).toBe(original);
    expect(fs.readFileSync(source, 'utf8')).toBe(sourceBytes);
    expect(fs.readdirSync(join(root, 'adr/archived')).sort()).toEqual(['.gitkeep', '1-choice.md', 'MANIFEST.json']);
    expect(readArchiveManifest(root)?.entries).toHaveLength(1);
  });

  it.skipIf(process.platform === 'win32')('refuses a device manifest before reading its bytes', () => {
    const root = repo(); const manifest = join(root, 'adr/archived/MANIFEST.json');
    fs.rmSync(manifest); fs.symlinkSync('/dev/zero', manifest);
    vi.mocked(fs.readFileSync).mockImplementation((path, ...args) => {
      if (String(path) === manifest) throw new Error('unsafe device read attempted');
      return actualFs.readFileSync(path, ...args);
    });
    expect(() => readArchiveManifest(root)).toThrow(/not a regular file.*character device/);
    expect(validateCommand(root).output).toMatch(/not a regular file.*character device/);
    expect(fs.readFileSync).not.toHaveBeenCalledWith(manifest, 'utf8');
  });
});

describe('visible Markdown and promotion', () => {
  it('rejects an entire decision hidden inside one HTML comment', () => {
    const root = repo(); const path = putDecision(root, 1);
    fs.writeFileSync(path, decision(1).replace('## Problem', '<!--\n## Problem') + '-->\n');
    expect(validateCommand(root).valid).toBe(false);
    expect(validateCommand(root).output).toContain('missing required section "## Problem"');
  });

  it('keeps a literal comment opener inside a fence from hiding visible H3 headings', () => {
    expect(writtenHeadings('```html\n<!--\n```\n\n### Risks\nVisible', 3)).toEqual(['Risks']);
  });

  it('keeps inline comment examples literal without exposing headings inside actual comments', () => {
    const root = repo();
    const path = putDecision(root, 1);
    fs.writeFileSync(path, decision(1).replace('Storage.', 'A literal `<!--` example and `` `<!--` `` sample.'));
    expect(validateCommand(root).valid).toBe(true);
    expect(writtenHeadings('A `<!--` example.\n### Risks\nVisible', 3)).toEqual(['Risks']);
    expect(writtenHeadings('<!-- ` -->\n### Risks\nVisible', 3)).toEqual(['Risks']);
  });

  it.each(['Decision', 'Consequences'])('keeps the proposal when its %s section conflicts with promotion', (heading) => {
    const root = repo(); const path = putProposal(root, `## ${heading}\nCustom notes.\n`);
    const original = fs.readFileSync(path, 'utf8');
    expect(validateCommand(root).valid).toBe(true);
    expect(() => implementCommand('Choice', root, 'agent', 'human')).toThrow(/duplicate section/);
    expect(fs.readFileSync(path, 'utf8')).toBe(original);
    expect(fs.readdirSync(join(root, 'adr/implemented'))).toEqual(['.gitkeep']);
  });

  it('keeps the existing content gate: empty optional-content sections still pass', () => {
    const root = repo(); putProposal(root);
    expect(validateCommand(root).valid).toBe(true);
    implementCommand('Choice', root, 'agent', 'human');
    expect(validateCommand(root).valid).toBe(true);
  });
});

describe('complete validation and scope acquisition', () => {
  it.each(['file', 'directory'])('reports citation scan failure for an unreadable %s', (kind) => {
    const root = repo(); const path = join(root, 'src'); fs.mkdirSync(path);
    const file = join(path, 'bad.ts'); fs.writeFileSync(file, '// @' + 'adr 999\n');
    expect(validateCommand(root).valid).toBe(false);
    if (kind === 'file') {
      vi.mocked(fs.readFileSync).mockImplementation((name, ...args) => {
        if (String(name) === file) throw new Error('EACCES reading source');
        return actualFs.readFileSync(name, ...args);
      });
    } else {
      vi.mocked(fs.readdirSync).mockImplementation((name, ...args) => {
        if (String(name) === path) throw new Error('EACCES listing source');
        return actualFs.readdirSync(name, ...args);
      });
    }
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('EACCES');
    expect(result.output).toContain('citation');
  });

  it('shows corpus issues alongside pending proposals', () => {
    const root = repo(); putProposal(root);
    fs.writeFileSync(join(root, 'bad.ts'), '// @' + 'adr 999\n');
    const output = instructionsCommand(root);
    expect(output).toContain('1 proposal pending');
    expect(output).toContain('cites ADR 999, which does not exist');
    expect(output).toContain('adrkit validate');
  });

  it.each(['src/cli*.ts', 'src/cl?.ts'])('accepts the matching filename glob %s', (scope) => {
    const root = repo(); fs.mkdirSync(join(root, 'src')); fs.writeFileSync(join(root, 'src/cli.ts'), '');
    putDecision(root, 1, scope);
    expect(relevantCommand(['src/cli.ts'], root).output).toContain('[1] Choice');
    expect(validateCommand(root).valid).toBe(true);
  });

  it.skipIf(process.platform === 'win32')('includes symlink leaves in directory scope queries without following loops', () => {
    const root = repo(); fs.mkdirSync(join(root, 'src')); fs.writeFileSync(join(root, 'real.ts'), '');
    fs.symlinkSync('../real.ts', join(root, 'src/linked.ts'));
    fs.symlinkSync('.', join(root, 'src/loop'));
    putDecision(root, 1, 'src/linked.ts');
    const result = relevantCommand(['src'], root);
    expect(result.complete).toBe(true);
    expect(result.output).toContain('[1] Choice');
  });
});
