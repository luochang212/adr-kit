import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

/** Formats supported by a single record's deliberation tree. */
const TREE_FORMATS = ['html', 'mermaid', 'text'] as const;

export interface AtlasOptions {
  /** Write the output here instead of returning it. */
  out?: string;
  /** Select the standalone relationship map instead of the whole atlas. */
  map?: boolean;
  /** Render one record's deliberation tree instead of the whole atlas. */
  record?: string;
  /** Output format for the selected object; the full atlas supports HTML only. */
  format?: string;
  formalOnly?: boolean;
  tag?: string;
  /** Page copy language: `en` (default) or `zh`. */
  lang?: string;
}

function isFormat(value: string): value is AtlasFormat {
  return (FORMATS as readonly string[]).includes(value);
}

function writeTarget(output: string, cwd: string, out: string | undefined, object: 'decision atlas' | 'deliberation tree', format: string): string {
  if (out === undefined) return output;
  if (out.trim().length === 0) {
    throw new Error('--out must name a file, not be empty');
  }
  const target = resolve(cwd, out);
  // An empty or directory target would otherwise surface as a raw EISDIR.
  if (existsSync(target) && statSync(target).isDirectory()) {
    throw new Error(`--out must name a file, not a directory: ${target}`);
  }
  if (!existsSync(dirname(target))) {
    throw new Error(`--out directory does not exist: ${dirname(target)}`);
  }
  writeFileSync(target, output);
  return `wrote ${object} (${format}) to ${target}`;
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
 * current records; `--record <name>` renders that decision's
 * deliberation tree; `--map` selects the standalone map. `--format` chooses
 * the selected object's encoding and never changes the object.
 */
export function atlasCommand(cwd: string, options: AtlasOptions = {}): string {
  const root = requireRoot(cwd);
  const format = options.format ?? 'html';
  if (!isFormat(format)) {
    throw new Error(`--format expects ${FORMATS.join(', ')}, not "${format}"`);
  }
  if (options.lang !== undefined && options.lang !== 'en' && options.lang !== 'zh') {
    throw new Error(`--lang expects en or zh, not "${options.lang}"`);
  }
  if (options.map === true && options.record !== undefined) {
    throw new Error('--map and --record are mutually exclusive');
  }
  if (options.lang !== undefined && (options.record !== undefined || options.map === true)) {
    throw new Error('--lang applies to the decision atlas page, not --record or --map');
  }
  if (options.record !== undefined) {
    if (!(TREE_FORMATS as readonly string[]).includes(format)) {
      throw new Error(`a deliberation tree supports only ${TREE_FORMATS.join(', ')}`);
    }
    if (options.tag !== undefined || options.formalOnly === true) {
      throw new Error('--tag and --formal-only require --map');
    }
    const output = treeCommand(options.record, cwd, { [format]: true });
    return writeTarget(output, cwd, options.out, 'deliberation tree', format);
  }

  if (options.map === true) {
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

  if (format !== 'html') {
    throw new Error(`the decision atlas supports only --format html; use --map --format ${format} for the decision map`);
  }
  if (options.tag !== undefined || options.formalOnly === true) {
    throw new Error('--tag and --formal-only require --map');
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
  return writeTarget(page, cwd, options.out, 'decision atlas', format);
}
