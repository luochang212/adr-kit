import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const docsDir = fileURLToPath(new URL('../docs/', import.meta.url));

function readDoc(name: string): string {
  return readFileSync(join(docsDir, name), 'utf8');
}

// openspec/specs/decision-provenance/spec.md requires the record-format
// reference to state the trust boundary in one place, and both language
// versions must agree. These assertions pin the boundary, because a rewrite of
// the prose already dropped it once and no test noticed.
describe('the record-format reference states the decided-by trust boundary', () => {
  it('names the inference, weakens it beside date and commit, and lists the defeaters', () => {
    const en = readDoc('record-format.md');
    expect(en).toContain('execution-environment inference');
    expect(en).toContain('weaker evidence than the observed `date` and `commit` fields');
    expect(en).toContain('through a wrapper');
    expect(en).toContain('editing the file afterwards');
    expect(en).toContain('cannot establish who independently chose or approved a decision');
  });

  it('carries the same boundary in the Chinese reference', () => {
    const zh = readDoc('zh/record-format.md');
    expect(zh).toContain('执行环境推断');
    expect(zh).toContain('可信度低于客观观测的 `date` 与 `commit`');
    expect(zh).toContain('wrapper');
    expect(zh).toContain('事后编辑文件');
    expect(zh).toContain('不能证明是谁自主拍板或批准决定');
  });

  it('never claims the field records who decided', () => {
    // The field infers the execution environment. Authorship and authorization
    // stay out of the record, so no page may resurrect the old claim.
    for (const file of ['record-format.md', 'zh/record-format.md', 'cli.md', 'workflow.md']) {
      expect(readDoc(file), file).not.toContain('who made the decision');
      expect(readDoc(file), file).not.toContain('whether a person or a machine initiated');
    }
  });
});
