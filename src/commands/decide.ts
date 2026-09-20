import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DecidedBy, RaisedBy } from '../core/adr.js';
import { readConfig, requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { folderPath, nextDecisionNumber, writeRecord } from '../core/repository.js';
import { decisionTemplate } from '../core/templates.js';
import { slugify } from '../core/slug.js';

/**
 * `decidedBy` is the declaration the caller made for this decision: the CLI
 * cannot observe who chose, so the value travels in rather than being inferred.
 */
export function decideCommand(
  title: string,
  cwd: string,
  decidedBy: DecidedBy,
  raisedBy: RaisedBy,
): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('title must not be empty');
  }
  if (/^\d+\s+/.test(trimmed)) {
    throw new Error('title must not start with a number; ADR Kit assigns decision numbers');
  }
  const root = requireRoot(cwd);
  const number = nextDecisionNumber(root);
  const fileName = `${number}-${slugify(trimmed)}.md`;
  const path = join(folderPath(root, 'decisions'), fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/decisions/${fileName}`);
  }
  const content = decisionTemplate(
    number,
    trimmed,
    readConfig(root).context,
    gitHead(root),
    decidedBy,
    raisedBy,
  );
  writeRecord(root, 'decisions', fileName, content);
  return `created adr/decisions/${fileName}\n\nfill in the decision and validate it with:\n  adrkit validate ${number}`;
}
