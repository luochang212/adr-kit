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
  /** The raw parsed YAML document (for forward compatibility). */
  raw: Record<string, unknown>;
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

export function readConfig(root: string): AdrKitConfig {
  const file = configPath(root);
  const { map } = parseConfigDocument(readFileSync(file, 'utf8'));
  const raw = map.toJSON() as Record<string, unknown>;
  const config: AdrKitConfig = { raw };
  if (typeof raw.context === 'string') {
    config.context = raw.context;
  }
  if (Array.isArray(raw.tools) && raw.tools.every((entry) => typeof entry === 'string')) {
    config.tools = raw.tools as string[];
  }

  if (raw.rules !== null && typeof raw.rules === 'object' && !Array.isArray(raw.rules)) {
    const rules: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(raw.rules as Record<string, unknown>)) {
      if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
        rules[key] = value as string[];
      }
    }
    config.rules = rules;
  }
  return config;
}

/**
 * Update the `tools:` key of `adr/config.yaml` in place. Preserves other
 * keys (`context`, `rules`, unknown keys) and comments attached to the
 * surrounding YAML nodes. When the existing `tools` value is a sequence,
 * reuse that node so its style and inline comments survive the rewrite.
 */
export function writeToolsConfig(root: string, tools: string[]): void {
  const file = configPath(root);
  const parsed = parseConfigDocument(readFileSync(file, 'utf8'));
  const pair = parsed.map.items.find((item) => {
    const key = item.key as { value?: unknown } | null | undefined;
    return key?.value === 'tools';
  });
  const existing = pair?.value;
  if (existing !== undefined && isSeq(existing)) {
    existing.items.length = 0;
    for (const tool of tools) {
      existing.items.push(parsed.document.createNode(tool));
    }
  } else {
    parsed.map.set('tools', tools);
  }
  writeFileSync(file, parsed.document.toString());
}
