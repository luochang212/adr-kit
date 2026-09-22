import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMMAND_OPTIONS, COMMANDS } from '../src/core/cli-options.js';
import { parseDeliberation, renderDeliberationMermaid, renderDeliberationText } from '../src/core/deliberation.js';

const docsDir = fileURLToPath(new URL('../docs/', import.meta.url));

function readDoc(name: string): string {
  return readFileSync(join(docsDir, name), 'utf8');
}

// docs/cli.md ships the `tree` command's output as a sample, and it drifted
// once: the annotated grammar arrived and the sample kept the old shapes in
// both languages. Pin the sample to real renderer output so the next grammar
// change cannot leave the reference lying.
describe('the tree samples in the CLI reference are real output', () => {
  const OUTLINE = [
    '- Storage decision [settled]',
    '  - Q: Which store? [settled]',
    '    - A: SQLite [settled] (recommended)',
    '      - Q: Which directory? [open]',
    '        - A: Workspace [open]',
    '    - A: JSON files [rejected] — needs a migration story',
  ].join('\n');

  it('quotes the text and mermaid renderers verbatim in both languages', () => {
    const nodes = parseDeliberation(OUTLINE);
    for (const file of ['cli.md', 'zh/cli.md']) {
      const doc = readDoc(file);
      expect(doc, file).toContain('```text\n' + renderDeliberationText(nodes) + '\n```');
      expect(doc, file).toContain('```mermaid\n' + renderDeliberationMermaid(nodes) + '\n```');
    }
  });

  it('does not claim the old root and option shapes', () => {
    for (const file of ['cli.md', 'zh/cli.md']) {
      expect(readDoc(file), file).not.toContain('n1["Which store?"]');
      expect(readDoc(file), file).not.toContain('- Which store? [settled]');
    }
  });
});

// openspec/specs/decision-provenance/spec.md requires the record-format
// reference to state what the value is and what it cannot prove, and both
// language versions must agree. These assertions pin that boundary, because a
// rewrite of the prose already dropped it once and no test noticed.
describe('the record-format reference states the decided-by trust boundary', () => {
  it('pins the declaration, its weakness, and what defeats it', () => {
    // Collapse whitespace so the assertion pins the rule, not where the prose
    // happens to wrap.
    const en = readDoc('record-format.md').replace(/\s+/g, ' ');
    expect(en).toContain('require the caller to declare it');
    expect(en).toContain('declaration, not an observation');
    expect(en).toContain('neither infers nor');
    expect(en).toContain('weaker evidence than the observed `date` and `commit` fields');
    expect(en).toContain('cannot establish who independently chose or approved a decision');
    expect(en).toContain('editing the file afterwards');
  });

  it('carries the same boundary in the Chinese reference', () => {
    const zh = readDoc('zh/record-format.md').replace(/\s+/g, ' ');
    expect(zh).toContain('要求调用方用');
    expect(zh).toContain('声明，不是观测');
    expect(zh).toContain('既不推断也不校验');
    expect(zh).toContain('可信度低于客观观测的 `date` 与 `commit`');
    expect(zh).toContain('不能证明是谁自主拍板或批准决定');
    expect(zh).toContain('事后编辑文件');
  });

  it('never resurrects the retired inference or authorization claims', () => {
    // The value is declared by the writer and the CLI cannot check it. No page
    // may claim the environment observed it or that the record proves who
    // authorized the decision, and no page may call the value an inference.
    // "who made the decision" is deliberately not banned: the record says who
    // originated the choice, and every page says so in the same breath as
    // "not whoever ran the command".
    for (const file of ['record-format.md', 'zh/record-format.md', 'cli.md', 'workflow.md']) {
      expect(readDoc(file), file).not.toContain('whether a person or a machine initiated');
      expect(readDoc(file), file).not.toContain('execution-environment inference');
      expect(readDoc(file), file).not.toContain('detected from the environment');
    }
  });

  it('pins the single-source boundary and where nuance lives', () => {
    const en = readDoc('record-format.md');
    // One value per record, decided by where the choice came from: a person
    // engaged the choice, or the agent's own judgment did. A passive approval
    // does not move the source, and split authorship is not representable.
    // Matching on collapsed whitespace keeps the assertion about the rule
    // rather than about where the prose happens to wrap.
    const flat = en.replace(/\s+/g, ' ');
    expect(flat).toContain('never co-signed');
    expect(flat).toContain(
      "letting an agent's proposal through without engaging with the choice does not move the source to `human`",
    );
    expect(flat).toContain('belong in `## Decision` as prose, not in the front matter');

    const zhFlat = readDoc('zh/record-format.md').replace(/\s+/g, '');
    expect(zhFlat).toContain('取值唯一、不做共同署名');
    expect(zhFlat).toContain('来源仍是`agent`');
    expect(zhFlat).toContain('不放进front');
  });

  it('sends a draft that carries the field to accept, not validate', () => {
    // `validate` covers durable records only: a draft is ephemeral and the
    // gate that rejects the field on one is `accept`. The reference used to
    // claim `validate` rejects it, which is not what the command does — hand
    // the draft to `validate` and it is simply not read.
    const en = readDoc('record-format.md').replace(/\s+/g, ' ');
    expect(en).toContain('`accept` refuses to promote one that does');
    expect(en).not.toContain('`validate` rejects one that does');
    const zh = readDoc('zh/record-format.md').replace(/\s+/g, '');
    expect(zh).toContain('带了`accept`会拒绝提升');
    expect(zh).not.toContain('带了会被`validate`拒绝');
  });

  it('keeps the retired migration framing out of the reference and the spec', () => {
    // The format has no adopters and the retired `machine` value never
    // shipped, so nothing needs a migration story: release notes for records
    // that do not exist promise something the tool cannot keep or break.
    expect(readDoc('record-format.md')).not.toContain('back-fill');
    expect(readDoc('zh/record-format.md')).not.toContain('回填');
    const spec = readFileSync(
      fileURLToPath(new URL('../openspec/specs/decision-provenance/spec.md', import.meta.url)),
      'utf8',
    );
    expect(spec).not.toContain('migration');
    expect(spec).not.toContain('pre-existing');
    expect(spec).toContain('### Requirement: Validation never writes the field');
  });
});

// The CLI reference ships two language versions, and they have drifted more
// than once: the Chinese signatures lost `[--workflows <list>]` when the flag
// arrived, and the Chinese `supersede` section went missing entirely. Pin the
// synopses to each other and to the CLI surface table in
// src/core/cli-options.ts, so a surface change cannot update one language
// (or neither) and still pass.
describe('the CLI reference signatures agree with each other and with the CLI', () => {
  const SYNOPSIS = /^### `adrkit (.+)`$/gm;

  function synopses(doc: string): string[] {
    return [...doc.matchAll(SYNOPSIS)].map((match) => match[1]!.trim());
  }

  it('carries the same signatures in both languages', () => {
    expect(synopses(readDoc('zh/cli.md'))).toEqual(synopses(readDoc('cli.md')));
  });

  it('only documents commands and flags the surface table knows', () => {
    for (const file of ['cli.md', 'zh/cli.md']) {
      for (const synopsis of synopses(readDoc(file))) {
        const command = synopsis.split(' ')[0]!;
        expect(COMMANDS as readonly string[], `${file}: adrkit ${synopsis}`).toContain(command);
        for (const flag of synopsis.matchAll(/--[a-z-]+/g)) {
          expect(COMMAND_OPTIONS[command] ?? [], `${file}: adrkit ${synopsis}`).toContain(flag[0]);
        }
      }
    }
  });

  it('sends an older CLI to upgrade adr-kit, never to adrkit update', () => {
    // An older CLI running `adrkit update` would rewrite the newer installed
    // skills with older templates, so its remedy is upgrading the package
    // itself. The reference once promised "names the upgrade" while the note
    // only said it was older; the note now names the upgrade and the pins
    // follow both languages.
    expect(readDoc('cli.md').replace(/\s+/g, ' ')).toContain(
      'an older one says to upgrade adr-kit to at least the version that wrote them',
    );
    expect(readDoc('zh/cli.md').replace(/\s+/g, '')).toContain(
      '则提示升级adr-kit，至少升到写入集成的版本',
    );
  });
});

// llms.txt is the machine-readable front door — agents read it instead of the
// README — and the site's integration story is hand-maintained next to
// src/core/tool-integrations.ts, which AGENTS.md requires them to mirror.
// llms.txt once listed codex, cursor, and github-copilot as integration
// tools; the CLI has never supported them. Pin both surfaces to the real
// targets: the default vendor-neutral `.agents/`, the `claude` exception,
// and the `--tools none` opt-out.
describe('llms.txt and the site integration story describe the real CLI', () => {
  const llms = readFileSync(
    fileURLToPath(new URL('../site/public/llms.txt', import.meta.url)),
    'utf8',
  );
  const ui = readFileSync(
    fileURLToPath(new URL('../site/src/i18n/ui.ts', import.meta.url)),
    'utf8',
  );

  it('only mentions commands and flags the CLI table knows', () => {
    for (const match of llms.matchAll(/`?adrkit ([a-z][a-z-]*)/g)) {
      expect(COMMANDS as readonly string[], `adrkit ${match[1]}`).toContain(match[1]!);
    }
    for (const match of llms.matchAll(/--[a-z-]+/g)) {
      const known = Object.values(COMMAND_OPTIONS).some((options) => options.includes(match[0]));
      expect(known, match[0]).toBe(true);
    }
  });

  it('describes the real integration targets, not the retired tool list', () => {
    expect(llms).toContain("vendor-neutral `.agents/`");
    expect(llms).toContain('claude (adds `.claude/` copies)');
    expect(llms).toContain('`--tools none`');
    for (const retired of ['codex', 'cursor', 'github-copilot']) {
      expect(llms, retired).not.toContain(retired);
    }
  });

  it('the site integration story mirrors the default target and the claude exception', () => {
    // One story per language; each must name the default `.agents/` target,
    // the `--tools claude` exception, and the `--tools none` opt-out.
    for (const phrase of ['.agents/', 'adrkit init --tools claude', '--tools none']) {
      expect(ui.split(phrase).length - 1, phrase).toBeGreaterThanOrEqual(2);
    }
    for (const retired of ['codex', 'cursor', 'github-copilot']) {
      expect(ui, retired).not.toContain(retired);
    }
  });
});
