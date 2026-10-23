import * as fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initRepository, listRecords } from '../src/core/repository.js';
import { visibleRecordText, writtenHeadings } from '../src/core/adr.js';
import { buildDecisionGraph } from '../src/core/graph.js';
import { archiveCommand } from '../src/commands/archive.js';
import { implementCommand } from '../src/commands/implement.js';
import { instructionsCommand } from '../src/commands/instructions.js';
import { rejectCommand } from '../src/commands/reject.js';
import { relevantCommand } from '../src/commands/relevant.js';
import { validateCommand } from '../src/commands/validate.js';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof fs>();
  return { ...original, writeFileSync: vi.fn(original.writeFileSync), readFileSync: vi.fn(original.readFileSync),
    renameSync: vi.fn(original.renameSync), readdirSync: vi.fn(original.readdirSync),
    rmSync: vi.fn(original.rmSync) };
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
  vi.mocked(fs.rmSync).mockReset().mockImplementation(actualFs.rmSync);
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
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

describe('movement gates and staged rollback', () => {
  it('refuses to implement a proposal citing a missing decision', () => {
    const root = repo(); const path = putProposal(root, 'See ADR 999 for details.\n');
    const original = fs.readFileSync(path, 'utf8');
    expect(validateCommand(root).valid).toBe(false);
    expect(() => implementCommand('Choice', root, 'agent', 'human')).toThrow(/body references decision 999/);
    expect(fs.readFileSync(path, 'utf8')).toBe(original);
    expect(fs.readdirSync(join(root, 'adr/implemented'))).toEqual(['.gitkeep']);
  });

  it('rolls the staged decision back when the proposal cannot be removed', () => {
    const root = repo(); const path = putProposal(root);
    vi.mocked(fs.rmSync).mockImplementation((name, ...args) => {
      if (String(name) === path) throw new Error('EACCES removing proposal');
      return actualFs.rmSync(name, ...args);
    });
    expect(() => implementCommand('Choice', root, 'agent', 'human')).toThrow(
      /staged adr\/implemented\/1-choice\.md, but removing the proposal failed/,
    );
    expect(fs.readdirSync(join(root, 'adr/implemented'))).toEqual(['.gitkeep']);
    expect(fs.existsSync(path)).toBe(true);
  });

  it('rolls the staged rejection back when the proposal cannot be removed', () => {
    const root = repo(); const path = putProposal(root);
    vi.mocked(fs.rmSync).mockImplementation((name, ...args) => {
      if (String(name) === path) throw new Error('EACCES removing proposal');
      return actualFs.rmSync(name, ...args);
    });
    expect(() => rejectCommand('Choice', 'wrong fit', root)).toThrow(
      /staged adr\/rejected\/2026-10-20-choice\.md, but removing the proposal failed/,
    );
    expect(fs.readdirSync(join(root, 'adr/rejected'))).toEqual(['.gitkeep']);
    expect(fs.existsSync(path)).toBe(true);
  });

  it('rolls the staged archived record back when the implemented source cannot be removed', () => {
    const root = repo(); const path = putDecision(root, 1);
    vi.mocked(fs.rmSync).mockImplementation((name, ...args) => {
      if (String(name) === path) throw new Error('EACCES removing source');
      return actualFs.rmSync(name, ...args);
    });
    expect(() => archiveCommand('1', 'no longer needed', root)).toThrow(
      /staged adr\/archived\/1-choice\.md, but removing the implemented source failed/,
    );
    expect(fs.readdirSync(join(root, 'adr/archived'))).toEqual(['.gitkeep']);
    expect(fs.existsSync(path)).toBe(true);
  });
});

describe('visible references and headings', () => {
  it('does not mine ADR references from fenced code or HTML comments', () => {
    const root = repo();
    fs.writeFileSync(
      join(root, 'adr/implemented/1-choice.md'),
      decision(1).replace(
        'Local files.',
        'Local files.\n\n```\nsee ADR 999 for the old approach\n```\n\n<!-- ADR 888 discussed elsewhere -->',
      ),
    );
    expect(validateCommand(root).valid).toBe(true);
  });

  it('keeps flagging a dangling reference in visible prose', () => {
    const root = repo();
    fs.writeFileSync(
      join(root, 'adr/implemented/1-choice.md'),
      decision(1).replace('Local files.', 'See ADR 999.'),
    );
    expect(validateCommand(root).valid).toBe(false);
    expect(validateCommand(root).output).toContain('body references decision 999');
  });

  it('masks a trailing HTML comment when naming a section heading', () => {
    const root = repo();
    fs.writeFileSync(
      join(root, 'adr/implemented/1-choice.md'),
      decision(1).replace('## Decision', '## Decision <!-- keep -->'),
    );
    expect(validateCommand(root).valid).toBe(true);
  });
});


describe('comments beginning on section headings', () => {
  it('rejects a required section whose body is hidden by a heading comment', () => {
    const root = repo();
    fs.writeFileSync(join(root, 'adr/implemented/1-choice.md'), decision(1).replace(
      '## Decision\nUse SQLite.', '## Decision <!--\nUse SQLite.\n-->',
    ));
    const result = validateCommand(root);
    expect(result.valid).toBe(false);
    expect(result.output).toContain('section "## Decision" must contain written content');
  });

  it('refuses promotion when only a heading comment contains the proposal', () => {
    const root = repo(); const path = putProposal(root);
    const original = proposal().replace('## Proposal\nUse SQLite.', '## Proposal <!--\nUse SQLite.\n-->');
    fs.writeFileSync(path, original);
    expect(() => implementCommand('Choice', root, 'agent', 'human')).toThrow(
      /section "## Proposal" must contain written content/,
    );
    expect(fs.readFileSync(path, 'utf8')).toBe(original);
    expect(fs.readdirSync(join(root, 'adr/implemented'))).toEqual(['.gitkeep']);
  });

  it('ignores heading-comment references while keeping visible references', () => {
    const root = repo(); putDecision(root, 2); putDecision(root, 3);
    fs.writeFileSync(join(root, 'adr/implemented/1-choice.md'), decision(1).replace(
      '## Decision', '## Decision <!--\nADR 999 and ADR 2\n-->\nSee ADR 3.',
    ));
    expect(validateCommand(root).valid).toBe(true);
    expect(buildDecisionGraph(listRecords(root)).referenceEdges).toEqual([{ from: 1, to: 3 }]);
  });

  it('preserves heading comments as hidden text through promotion', () => {
    const root = repo(); const path = putProposal(root);
    fs.writeFileSync(path, proposal().replace(
      '## Proposal', '## Proposal <!-- private draft note\nHidden text.\n--> ',
    ));
    implementCommand('Choice', root, 'agent', 'human');
    const content = fs.readFileSync(join(root, 'adr/implemented/1-choice.md'), 'utf8');
    expect(content).toContain('<!-- private draft note\nHidden text.\n-->');
    const record = listRecords(root).find((record) => record.number === 1)!;
    expect(visibleRecordText(record)).not.toContain('Hidden text.');
    expect(visibleRecordText(record)).toContain('Use SQLite.');
    expect(validateCommand(root).valid).toBe(true);
  });
});
