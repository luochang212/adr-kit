import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireRoot } from '../core/config.js';
import { gitHead } from '../core/git.js';
import { buildDecisionGraph } from '../core/graph.js';
import { renderDecisionAtlas } from '../core/decision-atlas.js';
import { listRecords } from '../core/repository.js';
import { graphCommand } from './graph.js';
import { treeCommand } from './tree.js';

/** The installed decision-atlas template the atlas renders into. */
const TEMPLATE_PATH = fileURLToPath(
  new URL('../../skills/adrkit-visualize/examples/decision-atlas.html', import.meta.url),
);

const FORMATS = ['mermaid', 'dot', 'text', 'html'] as const;
type AtlasFormat = (typeof FORMATS)[number];

/** The formats a single record's deliberation tree can take. */
const TREE_FORMATS = ['mermaid', 'text'] as const;

export interface AtlasOptions {
  /** Write the output here instead of returning it. */
  out?: string;
  /** Render one record's deliberation tree instead of the whole atlas. */
  record?: string;
  /** With `record`: the card diagram rather than a source text. */
  diagram?: boolean;
  /** With no record: the map's source or page format. With a record: the tree's source. */
  format?: string;
  formalOnly?: boolean;
  tag?: string;
  /** Page copy language: `en` (default) or `zh`. */
  lang?: string;
}

function isFormat(value: string): value is AtlasFormat {
  return (FORMATS as readonly string[]).includes(value);
}

function writeTarget(output: string, cwd: string, out: string | undefined): string {
  if (out === undefined) return output;
  const target = resolve(cwd, out);
  if (!existsSync(dirname(target))) {
    throw new Error(`--out directory does not exist: ${dirname(target)}`);
  }
  writeFileSync(target, output);
  return `wrote ${target}`;
}

/** `git@host:owner/repo.git` or `git+https://…` to a browser URL without `.git`. */
function normalizeRepositoryUrl(value: string): string {
  return value
    .replace(/^git\+/, '')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

/** The repository's browser URL: package metadata first, then the origin remote. */
function repositoryUrl(root: string): string {
  const manifest = join(root, 'package.json');
  if (existsSync(manifest)) {
    try {
      const repository = (JSON.parse(readFileSync(manifest, 'utf8')) as { repository?: unknown }).repository;
      const url = typeof repository === 'string' ? repository
        : (repository as { url?: unknown } | undefined)?.url;
      if (typeof url === 'string' && url.length > 0) return normalizeRepositoryUrl(url);
    } catch {
      // A malformed or absent package.json is not a reason to fail the atlas.
    }
  }
  try {
    return normalizeRepositoryUrl(execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim());
  } catch {
    return '';
  }
}

/**
 * The name the page gives the project: package name, else the repository
 * folder name. A nested `adr/` root would otherwise name the page after the
 * subdirectory that holds it.
 */
function projectName(root: string): string {
  const manifest = join(root, 'package.json');
  if (existsSync(manifest)) {
    try {
      const name = (JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown }).name;
      if (typeof name === 'string' && name.length > 0) return name;
    } catch {
      // Fall through to the repository name.
    }
  }
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (top.length > 0) return basename(top);
  } catch {
    // Not a Git repository: the ADR root is the best name available.
  }
  return basename(root);
}

/**
 * The one visualization command. No flags render the decision atlas from the
 * current records; `--record <name> --diagram` renders that decision's
 * deliberation tree; `--format` exports the decision map (`mermaid`, `dot`,
 * `text`, or the standalone `html` page) or, with a record, the tree's source.
 */
export function atlasCommand(cwd: string, options: AtlasOptions = {}): string {
  const root = requireRoot(cwd);
  const format = options.format;
  if (format !== undefined && !isFormat(format)) {
    throw new Error(`--format expects ${FORMATS.join(', ')}, not "${format}"`);
  }
  if (options.lang !== undefined && options.lang !== 'en' && options.lang !== 'zh') {
    throw new Error(`--lang expects en or zh, not "${options.lang}"`);
  }
  if (options.lang !== undefined && (options.record !== undefined || format !== undefined)) {
    throw new Error('--lang applies to the decision atlas page, not --record or --format');
  }
  if (options.diagram === true && options.record === undefined) {
    throw new Error('--diagram requires --record <name>');
  }
  if (options.record !== undefined) {
    if (options.diagram === true && format !== undefined) {
      throw new Error('--diagram and --format are mutually exclusive');
    }
    if (options.diagram !== true && format === undefined) {
      throw new Error('--record requires --diagram or --format <mermaid|text>');
    }
    if (format !== undefined && !(TREE_FORMATS as readonly string[]).includes(format)) {
      throw new Error(`a deliberation tree has only ${TREE_FORMATS.join(' or ')}; use --diagram for the card view`);
    }
    if (options.tag !== undefined || options.formalOnly === true) {
      throw new Error('--tag and --formal-only apply to --format exports of the whole set');
    }
    const output = options.diagram === true
      ? treeCommand(options.record, cwd, { html: true })
      : treeCommand(options.record, cwd, { [format!]: true });
    return writeTarget(output, cwd, options.out);
  }

  if (format !== undefined) {
    const flags = {
      formalOnly: options.formalOnly,
      tag: options.tag,
      out: options.out,
    };
    return graphCommand(cwd, format === 'mermaid' ? { ...flags, mermaid: true }
      : format === 'dot' ? { ...flags, dot: true }
      : format === 'text' ? { ...flags, text: true }
      : { ...flags, html: true });
  }

  if (options.tag !== undefined || options.formalOnly === true) {
    throw new Error('--tag and --formal-only apply to --format exports of the whole set');
  }
  const records = listRecords(root, ['implemented', 'archived']);
  const page = renderDecisionAtlas({
    template: readFileSync(TEMPLATE_PATH, 'utf8'),
    records,
    graph: buildDecisionGraph(records),
    commit: gitHead(root) ?? 'HEAD',
    repositoryUrl: repositoryUrl(root),
    projectName: projectName(root),
    language: options.lang === 'zh' ? 'zh' : 'en',
  });
  return writeTarget(page, cwd, options.out);
}
