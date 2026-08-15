import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { hasMeaningfulBody, parseAdrFile, type AdrRecord } from './adr.js';
import { ADR_DIR, CONFIG_FILE, readConfig } from './config.js';
import { FOLDERS, listRecords } from './repository.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

const DECISION_REQUIRED = ['Problem', 'Decision', 'Alternatives considered', 'Consequences'];
const PROPOSED_REQUIRED = ['Problem', 'Proposal', 'Alternatives considered', 'Acceptance criteria', 'Risks'];
const REJECTED_REQUIRED = ['Problem', 'Proposal', 'Alternatives considered'];
const PROPOSAL_ERA_HEADINGS = ['Proposal', 'Acceptance criteria', 'Risks', 'Plan', 'Migration plan'];

export function validateRecord(root: string, record: AdrRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = relative(root, record.path);

  if (record.folder === 'decisions') {
    if (!/^\d{4}-[a-z0-9-]+\.md$/.test(record.fileName)) {
      issues.push({ path, message: 'decision file name must be "NNNN-slug.md"' });
    }
    if (record.number === undefined) {
      issues.push({ path, message: 'accepted decision title must be "# ADR: NNNN <title>"' });
    } else {
      const padded = String(record.number).padStart(4, '0');
      if (!record.fileName.startsWith(`${padded}-`)) {
        issues.push({ path, message: `file name number must match title number ${padded}` });
      }
    }
  } else {
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9-]+\.md$/;
    const match = record.fileName.match(datePattern);
    if (match === null) {
      issues.push({ path, message: 'file name must be "YYYY-MM-DD-slug.md"' });
    } else {
      const date = new Date(`${match[1]!}-${match[2]!}-${match[3]!}`);
      if (Number.isNaN(date.getTime())) {
        issues.push({ path, message: 'file name contains an invalid date' });
      }
    }
  }

  const required = record.folder === 'decisions'
    ? DECISION_REQUIRED
    : record.folder === 'proposed'
      ? PROPOSED_REQUIRED
      : REJECTED_REQUIRED;

  const headings = new Set(record.sections.map((section) => section.heading));
  for (const heading of required) {
    if (!headings.has(heading)) {
      issues.push({ path, message: `missing required section "## ${heading}"` });
    }
  }

  if (record.folder === 'decisions') {
    for (const heading of PROPOSAL_ERA_HEADINGS) {
      if (headings.has(heading)) {
        issues.push({
          path,
          message: `accepted decision must not contain proposal-era section "## ${heading}"`,
        });
      }
    }
  }

  if (!hasMeaningfulBody(record.sections.find((section) => section.heading === 'Alternatives considered')?.body)) {
    issues.push({
      path,
      message: 'section "## Alternatives considered" must contain at least one written alternative',
    });
  }

  return issues;
}

export function validateRepository(root: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const configFile = join(root, ADR_DIR, CONFIG_FILE);
  if (!existsSync(configFile)) {
    issues.push({ path: `${ADR_DIR}/${CONFIG_FILE}`, message: 'missing config file' });
  } else {
    try {
      readConfig(root);
    } catch (error) {
      issues.push({
        path: `${ADR_DIR}/${CONFIG_FILE}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const folder of FOLDERS) {
    if (!existsSync(join(root, ADR_DIR, folder))) {
      issues.push({ path: `${ADR_DIR}/${folder}`, message: 'missing folder' });
    }
  }

  let records: AdrRecord[];
  try {
    records = listRecords(root);
  } catch (error) {
    issues.push({
      path: ADR_DIR,
      message: error instanceof Error ? error.message : String(error),
    });
    return issues;
  }

  const decisionNumbers = new Set<number>();
  for (const record of records) {
    issues.push(...validateRecord(root, record));
    if (record.folder === 'decisions' && record.number !== undefined) {
      if (decisionNumbers.has(record.number)) {
        issues.push({
          path: relative(root, record.path),
          message: `duplicate decision number ${String(record.number).padStart(4, '0')}`,
        });
      }
      decisionNumbers.add(record.number);
    }
  }

  return issues;
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'OK';
  const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
  return `found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
