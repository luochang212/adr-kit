import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isMap, isSeq, parseDocument, type Document, type YAMLMap } from 'yaml';

export const ADR_DIR = 'adr';
export const CONFIG_FILE = 'config.yaml';

export interface AdrKitConfig {
  /** Project context shown to agents and humans when records are created. */
  context?: string;
  /** Optional per-status rules, e.g. `rules.proposal: ["Keep it short"]`. */
  rules?: Record<string, string[]>;
  /** AI tool integrations selected at init time, e.g. `["claude", "codex"]`. */
  tools?: string[];
  /** Workflow subset for integrations, e.g. `["init", "record", "validate"]`. */
  workflows?: string[];
  /** Version of the CLI that last wrote the integrations; absent before this stamp existed. */
  installedWith?: string;
}

/**
 * Walk from `startDir` upward to find the nearest directory that contains
 * `adr/config.yaml`. Returns the project root (the parent of `adr/`), or
 * `undefined` when no ADR Kit repository exists.
 */
export function findRoot(startDir: string): string | undefined {
  let current = resolve(startDir);
  for (;;) {
    if (existsSync(join(current, ADR_DIR, CONFIG_FILE))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export function requireRoot(startDir: string): string {
  const root = findRoot(startDir);
  if (root === undefined) {
    throw new Error(
      `no ADR Kit repository found from "${startDir}" (run "adrkit init" first)`,
    );
  }
  return root;
}

export function configPath(root: string): string {
  return join(root, ADR_DIR, CONFIG_FILE);
}

interface ParsedConfig {
  document: Document;
  map: YAMLMap;
}

function parseConfigDocument(text: string): ParsedConfig {
  const document = parseDocument(text, { prettyErrors: true });
  const firstError = document.errors[0];
  if (firstError !== undefined) {
    throw new Error(`invalid ${ADR_DIR}/${CONFIG_FILE}: ${firstError.message}`);
  }
  if (!isMap(document.contents)) {
    throw new Error(`invalid ${ADR_DIR}/${CONFIG_FILE}: top-level value must be a mapping`);
  }
  return { document, map: document.contents };
}

/** Read effective config and type diagnostics from the same parsed values. */
export function inspectConfig(root: string): { config: AdrKitConfig; issues: string[] } {
  const file = configPath(root);
  const { map } = parseConfigDocument(readFileSync(file, 'utf8'));
  const raw = map.toJSON() as Record<string, unknown>;
  const config: AdrKitConfig = {};
  const issues: string[] = [];

  function report(field: string, expected: string, hint = ''): void {
    const safeField = field.replace(/[\u0000-\u001f\u007f-\u009f]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
    issues.push(`${safeField} must be ${expected}${hint}`);
  }

  function stringValue(key: string): string | undefined {
    if (!Object.hasOwn(raw, key)) return undefined;
    const value = raw[key];
    if (typeof value === 'string') return value;
    report(key, 'a string');
    return undefined;
  }

  function stringList(value: unknown, field: string): string[] | undefined {
    if (!Array.isArray(value)) {
      report(field, 'a list of strings');
      return undefined;
    }
    let valid = true;
    value.forEach((entry: unknown, index: number) => {
      if (typeof entry === 'string') return;
      const hint = field.startsWith('rules.') && entry !== null
        && typeof entry === 'object' && !Array.isArray(entry)
        ? '; an unquoted ": " creates a YAML mapping; quote the whole item to keep it a string'
        : '';
      report(`${field}[${index}]`, 'a string', hint);
      valid = false;
    });
    return valid ? value as string[] : undefined;
  }

  const context = stringValue('context');
  if (context !== undefined) config.context = context;
  const installedWith = stringValue('installed-with');
  if (installedWith !== undefined) config.installedWith = installedWith;
  for (const key of ['tools', 'workflows'] as const) {
    if (!Object.hasOwn(raw, key)) continue;
    const values = stringList(raw[key], key);
    if (values !== undefined) config[key] = values;
  }
  if (Object.hasOwn(raw, 'rules')) {
    if (raw.rules !== null && typeof raw.rules === 'object' && !Array.isArray(raw.rules)) {
      const rules: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(raw.rules)) {
        const values = stringList(value, `rules.${key}`);
        if (values !== undefined) rules[key] = values;
      }
      config.rules = rules;
    } else {
      report('rules', 'a mapping of string lists');
    }
  }
  return { config, issues };
}

export function readConfig(root: string): AdrKitConfig {
  return inspectConfig(root).config;
}

/**
 * Read the configuration without throwing. The drift notice must never turn a
 * command into a failure: a repository with a malformed `adr/config.yaml`
 * simply has nothing honest to say about its stamp, and validation (`validate`,
 * plus `instructions` via the same repository check) reports the broken file.
 */
export function readConfigSafe(root: string): AdrKitConfig | undefined {
  try {
    return readConfig(root);
  } catch {
    return undefined;
  }
}

/**
 * Rewrite a list-valued key of `adr/config.yaml` in place. Preserves other
 * keys (`context`, `rules`, unknown keys) and comments attached to the
 * surrounding YAML nodes. When the existing value is a sequence, reuse that
 * node to keep its flow/block style; the items are re-created, so a comment
 * attached to an individual item does not survive.
 */
function writeListConfig(root: string, key: string, values: string[]): void {
  const file = configPath(root);
  const parsed = parseConfigDocument(readFileSync(file, 'utf8'));
  const pair = parsed.map.items.find((item) => {
    const itemKey = item.key as { value?: unknown } | null | undefined;
    return itemKey?.value === key;
  });
  const existing = pair?.value;
  if (existing !== undefined && isSeq(existing)) {
    existing.items.length = 0;
    for (const value of values) {
      existing.items.push(parsed.document.createNode(value));
    }
  } else {
    parsed.map.set(key, values);
  }
  writeFileSync(file, parsed.document.toString());
}

/** Update the `tools:` key; see {@link writeListConfig} for the semantics. */
export function writeToolsConfig(root: string, tools: string[]): void {
  writeListConfig(root, 'tools', tools);
}

/** Update the `workflows:` key; see {@link writeListConfig} for the semantics. */
export function writeWorkflowsConfig(root: string, workflows: string[]): void {
  writeListConfig(root, 'workflows', workflows);
}

/**
 * Stamp the `installed-with:` scalar with the version that is writing the
 * integrations. The stamp is what lets later commands notice that the
 * installed skills predate (or postdate) the running CLI; see
 * {@link installedWithNotice}.
 */
export function writeInstalledWithConfig(root: string, version: string): void {
  const file = configPath(root);
  const parsed = parseConfigDocument(readFileSync(file, 'utf8'));
  parsed.map.set('installed-with', version);
  writeFileSync(file, parsed.document.toString());
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function semver(value: string): [number, number, number] | undefined {
  const match = SEMVER.exec(value.trim());
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * The one-line drift notice for a repository whose integrations were written
 * by a different adr-kit than the one now running. The newer side suggests
 * `adrkit update`; the older side directs to upgrading the package instead,
 * because running `adrkit update` there would rewrite the newer installed
 * skills with this CLI's older templates. Quiet — `undefined` — when
 * there is nothing honest to say: no stamp (repositories configured before it
 * existed), an explicit integrations opt-out, equal versions, or a version
 * either side cannot parse.
 */
export function installedWithNotice(
  config: AdrKitConfig,
  currentVersion: string,
): string | undefined {
  const installed = config.installedWith;
  if (installed === undefined) return undefined;
  if (config.tools !== undefined && config.tools.length === 0) return undefined;
  const written = semver(installed);
  const running = semver(currentVersion);
  if (written === undefined || running === undefined) return undefined;
  const order = written[0] - running[0] || written[1] - running[1] || written[2] - running[2];
  if (order === 0) return undefined;
  return order < 0
    ? `note: the installed integrations were written by adr-kit ${installed}; this is ` +
        `${currentVersion} - run "adrkit update" to refresh them`
    : `note: this repository was configured by adr-kit ${installed}; you are running ` +
        `${currentVersion}, which is older - upgrade adr-kit to at least ${installed}`;
}

/** Append the drift notice to a command's output as its own paragraph. */
export function withNotice(output: string, notice: string | undefined): string {
  return notice === undefined ? output : `${output}\n\n${notice}`;
}
