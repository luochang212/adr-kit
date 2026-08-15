import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isMap, parseDocument } from 'yaml';

export const ADR_DIR = 'adr';
export const CONFIG_FILE = 'config.yaml';

export interface OpenAdrConfig {
  /** Project context shown to agents and humans when records are created. */
  context?: string;
  /** Optional per-status rules, e.g. `rules.proposal: ["Keep it short"]`. */
  rules?: Record<string, string[]>;
  /** The raw parsed YAML document (for forward compatibility). */
  raw: Record<string, unknown>;
}

/**
 * Walk from `startDir` upward to find the nearest directory that contains
 * `adr/config.yaml`. Returns the project root (the parent of `adr/`), or
 * `undefined` when no OpenADR repository exists.
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
      `no OpenADR repository found from "${startDir}" (run "openadr init" first)`,
    );
  }
  return root;
}

export function configPath(root: string): string {
  return join(root, ADR_DIR, CONFIG_FILE);
}

export function readConfig(root: string): OpenAdrConfig {
  const file = configPath(root);
  const text = readFileSync(file, 'utf8');
  const document = parseDocument(text, { prettyErrors: true });
  const firstError = document.errors[0];
  if (firstError !== undefined) {
    throw new Error(`invalid ${ADR_DIR}/${CONFIG_FILE}: ${firstError.message}`);
  }
  if (!isMap(document.contents)) {
    throw new Error(`invalid ${ADR_DIR}/${CONFIG_FILE}: top-level value must be a mapping`);
  }
  const raw = document.contents.toJSON() as Record<string, unknown>;
  const config: OpenAdrConfig = { raw };
  if (typeof raw.context === 'string') {
    config.context = raw.context;
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
