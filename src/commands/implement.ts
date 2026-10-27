import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { hasMeaningfulBody, parseAdrText, section, type DecidedBy, type RaisedBy } from '../core/adr.js';
import { requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { folderPath, listRecords, nextDecisionNumber, removeRecord, resolveProposed, writeRecord } from '../core/repository.js';
import { droppedSections, proposalToDecision } from '../core/templates.js';
import { formatIssues, validateRecord, validateRecordReferences } from '../core/validate.js';

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

  // The same readiness gate `adrkit validate <name>` and `instructions` apply:
  // structure plus cross-references. A proposal citing a missing decision must
  // be refused here too, or promotion would create a record that fails
  // validation the moment it lands.
  const records = listRecords(root);
  const issues = [
    ...validateRecord(root, proposal),
    ...validateRecordReferences(root, proposal, records),
  ];
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
  const generated = parseAdrText(content, path);
  generated.folder = 'implemented';
  const generatedIssues = [
    ...validateRecord(root, generated),
    ...validateRecordReferences(root, generated, records),
  ];
  if (generatedIssues.length > 0) {
    throw new Error(`proposal cannot become a valid implemented decision:\n${formatIssues(generatedIssues)}`);
  }
  writeRecord(root, 'implemented', fileName, content);
  try {
    removeRecord(proposal);
  } catch (error) {
    // The staged decision is rolled back so re-running the command cannot
    // allocate a second number for the same proposal; the proposal itself is
    // untouched. Same boundary retireRecord holds for archive and supersede.
    // Roll back only bytes this call staged: a concurrent move may have
    // staged its own record under the same name after ours.
    try {
      if (readFileSync(path, 'utf8') === content) rmSync(path, { force: true });
    } catch {
      // A file we cannot read back is not ours to delete.
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `staged adr/implemented/${fileName}, but removing the proposal failed: ${detail}. The proposal is still in adr/proposed/; resolve the error and run implement again`,
      { cause: error },
    );
  }
  let output = `implemented adr/proposed/${proposal.fileName} as adr/implemented/${fileName}`;
  if (proposal.introProse !== undefined) {
    output += '\nwarning: dropped prose between the title and the first section; move it under a section to keep it';
  }
  const dropped = droppedSections(proposal);
  if (dropped.length > 0) {
    output += `\nwarning: dropped section(s) with no place in an implemented decision: ${dropped
      .map((heading) => `## ${heading}`)
      .join(', ')}`;
  }
  const folded: string[] = [];
  if (hasMeaningfulBody(section(proposal, 'Acceptance criteria'))) {
    folded.push('## Acceptance criteria -> ### Verification');
  }
  if (hasMeaningfulBody(section(proposal, 'Risks'))) {
    folded.push('## Risks -> ### Trade-offs');
  }
  if (folded.length > 0) {
    output += `\nwarning: folded ${folded.join(', ')} under ## Consequences; rewrite the new subsections as present-tense shipped facts before validating.`;
  }
  return output;
}
