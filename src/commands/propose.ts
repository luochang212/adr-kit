import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { requireRoot } from '../core/config.js';
import { todayStamp, writeRecord } from '../core/repository.js';
import { proposalTemplate } from '../core/templates.js';
import { slugify } from '../core/slug.js';

export function proposeCommand(title: string, cwd: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('title must not be empty');
  }
  const root = requireRoot(cwd);
  const slug = slugify(trimmed);
  const fileName = `${todayStamp()}-${slug}.md`;
  const path = join(root, 'adr', 'proposed', fileName);
  if (existsSync(path)) {
    throw new Error(`proposal already exists: adr/proposed/${fileName}`);
  }
  const content = proposalTemplate(trimmed);
  writeRecord(root, 'proposed', fileName, content);
  return `created adr/proposed/${fileName}\n\nvalidate it with:\n  openadr validate ${fileName}`;
}
