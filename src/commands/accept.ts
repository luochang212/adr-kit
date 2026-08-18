import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { requireRoot } from '../core/config.js';
import {
  nextDecisionNumber,
  removeRecord,
  resolveRecord,
  writeRecord,
} from '../core/repository.js';
import { proposalToDecision } from '../core/templates.js';
import { formatIssues, validateRecord } from '../core/validate.js';

export function acceptCommand(query: string, cwd: string): string {
  const root = requireRoot(cwd);
  const record = resolveRecord(root, query);
  if (record.folder !== 'proposed') {
    throw new Error(`"${query}" is not a proposal (it is in ${record.folder})`);
  }
  if (/^\d{4}\s+/.test(record.title)) {
    throw new Error('proposal title must not start with a four-digit number; ADR Kit assigns decision numbers');
  }

  const issues = validateRecord(root, record);
  if (issues.length > 0) {
    throw new Error(`proposal is not valid; fix it before accepting:\n${formatIssues(issues)}`);
  }

  const number = nextDecisionNumber(root);
  const padded = String(number).padStart(4, '0');
  const slug = record.fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const fileName = `${padded}-${slug}.md`;
  const path = join(root, 'adr', 'decisions', fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/decisions/${fileName}`);
  }

  const content = proposalToDecision(record, number);
  writeRecord(root, 'decisions', fileName, content);
  removeRecord(record);
  return `accepted adr/proposed/${record.fileName} as adr/decisions/${fileName}`;
}
