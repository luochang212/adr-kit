import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { hasMeaningfulBody, statusForFolder, type AdrRecord } from './adr.js';
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

  const statusMatchesFolder = record.folder === 'decisions'
    ? record.status === 'accepted' || record.status === 'superseded'
    : record.status === statusForFolder(record.folder);
  if (!statusMatchesFolder) {
    issues.push({
      path,
      message: `status "${record.status}" does not match folder "${record.folder}"`,
    });
  }

  if (record.status === 'superseded') {
    if (record.supersededBy === undefined) {
      issues.push({ path, message: 'superseded status must reference a decision number' });
    } else if (record.supersededBy === record.number) {
      issues.push({ path, message: 'a decision cannot supersede itself' });
    }
  }

  if (record.folder === 'decisions') {
    if (!/^\d+-[a-z0-9\u4e00-\u9fff-]+\.md$/.test(record.fileName)) {
      issues.push({ path, message: 'decision file name must be "N-slug.md"' });
    }
    if (record.number === undefined) {
      issues.push({ path, message: 'accepted decision title must be "# ADR: N <title>"' });
    } else {
      if (!record.fileName.startsWith(`${record.number}-`)) {
        issues.push({ path, message: `file name number must match title number ${record.number}` });
      }
    }
  } else {
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9\u4e00-\u9fff-]+\.md$/;
    const match = record.fileName.match(datePattern);
    if (match === null) {
      issues.push({ path, message: 'file name must be "YYYY-MM-DD-slug.md"' });
    } else {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        issues.push({ path, message: 'file name contains an invalid calendar date' });
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

  const meaningfulHeadings = record.folder === 'decisions'
    ? ['Problem', 'Decision']
    : ['Problem', 'Proposal'];
  for (const heading of meaningfulHeadings) {
    const body = record.sections.find((section) => section.heading === heading)?.body;
    if (!hasMeaningfulBody(body)) {
      issues.push({
        path,
        message: `section "## ${heading}" must contain written content`,
      });
    }
  }

  const seen = new Set<string>();
  for (const section of record.sections) {
    if (seen.has(section.heading)) {
      issues.push({ path, message: `duplicate section "## ${section.heading}"` });
    }
    seen.add(section.heading);
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

  const decisionRecords = new Map<number, AdrRecord>();
  for (const record of records) {
    issues.push(...validateRecord(root, record));
    if (record.folder === 'decisions' && record.number !== undefined) {
      if (decisionRecords.has(record.number)) {
        issues.push({
          path: relative(root, record.path),
          message: `duplicate decision number ${record.number}`,
        });
      }
      decisionRecords.set(record.number, record);
    }
  }

  for (const record of records) {
    if (record.supersededBy === undefined) continue;
    const path = relative(root, record.path);
    const target = decisionRecords.get(record.supersededBy);
    if (target === undefined) {
      issues.push({
        path,
        message: `"superseded by ${record.supersededBy}" references a missing decision`,
      });
    } else if (target.status === 'superseded') {
      issues.push({
        path,
        message: `"superseded by ${record.supersededBy}" references a superseded decision; supersede that decision instead`,
      });
    }
  }

  return issues;
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'OK';
  const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
  return `found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
