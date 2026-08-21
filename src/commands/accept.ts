import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { folderPath, nextDecisionNumber, removeRecord, resolveDraft, writeRecord } from '../core/repository.js';
import { droppedSections, proposalToDecision } from '../core/templates.js';
import { formatIssues, validateDraft } from '../core/validate.js';

export function acceptCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  const draft = resolveDraft(root, query);
  if (/^\d+\s+/.test(draft.title)) {
    throw new Error('proposal title must not start with a number; ADR Kit assigns decision numbers');
  }

  const issues = validateDraft(root, draft);
  if (issues.length > 0) {
    throw new Error(`draft is not ready; fix it before accepting:\n${formatIssues(issues)}`);
  }

  const number = nextDecisionNumber(root);
  const slug = draft.fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const fileName = `${number}-${slug}.md`;
  const path = join(folderPath(root, 'decisions'), fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/decisions/${fileName}`);
  }

  const content = proposalToDecision(draft, number, gitHead(root));
  writeRecord(root, 'decisions', fileName, content);
  removeRecord(draft);
  let output = `accepted adr/.drafts/${draft.fileName} as adr/decisions/${fileName}`;
  const dropped = droppedSections(draft);
  if (dropped.length > 0) {
    output += `\nwarning: dropped section(s) with no place in an accepted decision: ${dropped
      .map((heading) => `## ${heading}`)
      .join(', ')}`;
  }
  return output;
}
