import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { requireRoot } from '../core/config.js';
import { nextDecisionNumber, writeRecord } from '../core/repository.js';
import { decisionTemplate } from '../core/templates.js';
import { slugify } from '../core/slug.js';

export function decideCommand(title: string, cwd: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('title must not be empty');
  }
  const root = requireRoot(cwd);
  const number = nextDecisionNumber(root);
  const padded = String(number).padStart(4, '0');
  const fileName = `${padded}-${slugify(trimmed)}.md`;
  const path = join(root, 'adr', 'decisions', fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/decisions/${fileName}`);
  }
  const content = decisionTemplate(number, trimmed);
  writeRecord(root, 'decisions', fileName, content);
  return `created adr/decisions/${fileName}\n\nfill in the draft and validate it with:\n  openadr validate ${padded}`;
}
