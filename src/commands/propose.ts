import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readConfig, requireRoot } from '../core/config.js';
import { draftsPath, writeRecord } from '../core/repository.js';
import { todayStamp } from '../core/adr.js';
import { proposalTemplate } from '../core/templates.js';
import { slugify } from '../core/slug.js';

export function proposeCommand(title: string, cwd: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('title must not be empty');
  }
  if (/^\d+\s+/.test(trimmed)) {
    throw new Error('title must not start with a number; ADR Kit assigns decision numbers');
  }
  const root = requireRoot(cwd);
  const slug = slugify(trimmed);
  const fileName = `${todayStamp()}-${slug}.md`;
  const path = join(draftsPath(root), fileName);
  if (existsSync(path)) {
    throw new Error(`draft already exists: adr/.drafts/${fileName}`);
  }
  const content = proposalTemplate(trimmed, readConfig(root).context);
  writeRecord(root, 'drafts', fileName, content);
  return [
    `created adr/.drafts/${fileName}`,
    '',
    'A draft is ephemeral: promote it with',
    `  adrkit accept "${trimmed}"`,
    'or discard it with',
    `  adrkit reject "${trimmed}"`,
  ].join('\n');
}
