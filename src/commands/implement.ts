import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DecidedBy, RaisedBy } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { folderPath, nextDecisionNumber, removeRecord, resolveProposed, writeRecord } from '../core/repository.js';
import { droppedSections, proposalToDecision } from '../core/templates.js';
import { formatIssues, validateProposal } from '../core/validate.js';

/**
 * `decidedBy` is the declaration the caller made for the promoted decision:
 * the CLI cannot observe who chose, so the value travels in rather than being
 * inferred. Promotion is also where the value enters the durable record.
 */
export function implementCommand(
  query: string,
  cwd: string,
  decidedBy: DecidedBy,
  raisedBy: RaisedBy,
): string {
  const root = requireRoot(cwd);
  const proposal = resolveProposed(root, query);
  if (/^\d+\s+/.test(proposal.title)) {
    throw new Error('proposal title must not start with a number; ADR Kit assigns decision numbers');
  }

  const issues = validateProposal(root, proposal);
  if (issues.length > 0) {
    throw new Error(`proposal is not ready to implement:\n${formatIssues(issues)}`);
  }

  const number = nextDecisionNumber(root);
  const slug = proposal.fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const fileName = `${number}-${slug}.md`;
  const path = join(folderPath(root, 'implemented'), fileName);
  if (existsSync(path)) {
    throw new Error(`decision already exists: adr/implemented/${fileName}`);
  }

  const content = proposalToDecision(proposal, number, gitHead(root), decidedBy, raisedBy);
  writeRecord(root, 'implemented', fileName, content);
  removeRecord(proposal);
  let output = `implemented adr/proposed/${proposal.fileName} as adr/implemented/${fileName}`;
  const dropped = droppedSections(proposal);
  if (dropped.length > 0) {
    output += `\nwarning: dropped section(s) with no place in an implemented decision: ${dropped
      .map((heading) => `## ${heading}`)
      .join(', ')}`;
  }
  return output;
}
