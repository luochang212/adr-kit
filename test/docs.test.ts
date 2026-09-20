import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const docsDir = fileURLToPath(new URL('../docs/', import.meta.url));

function readDoc(name: string): string {
  return readFileSync(join(docsDir, name), 'utf8');
}

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
