import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig, requireRoot } from '../core/config.js';
import { nextDecisionNumber, writeRecord } from '../core/repository.js';
import { decisionTemplate } from '../core/templates.js';
import { slugify } from '../core/slug.js';

export function decideCommand(title: string, cwd: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('title must not be empty');
  }
  if (/^\d{4}\s+/.test(trimmed)) {
    throw new Error('title must not start with a four-digit number; ADR Kit assigns decision numbers');
  }
  const root = requireRoot(cwd);
  const number = nextDecisionNumber(root);
  const padded = String(number).padStart(4, '0');
  const fileName = `${padded}-${slugify(trimmed)}.md`;
  const path = join(root, 'adr', 'decisions', fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/decisions/${fileName}`);
  }
  const content = decisionTemplate(number, trimmed, readConfig(root).context);
  writeRecord(root, 'decisions', fileName, content);
  return `created adr/decisions/${fileName}\n\nfill in the draft and validate it with:\n  adrkit validate ${padded}`;
}
