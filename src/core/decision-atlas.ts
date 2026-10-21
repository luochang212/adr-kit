import type { AdrRecord } from './adr.js';
import type { DecisionGraph } from './graph.js';
import { renderDecisionMapSvg } from './graph-html.js';
import { relativePath } from './repository.js';
import { escapeHtml } from './view-text.js';

/**
 * The replaceable regions in the shipped archive-page example. The example is
 * a snapshot an agent can adapt by hand; this repository's site build uses the
 * same markers so the published atlas and the installed resource cannot drift
 * into two frontends.
 */
export const ATLAS_SLOTS = [
  'title',
  'hero',
  'stats',
  'density-note',
  'inbound-note',
  'replacements-note',
  'map',
  'footer',
] as const;

export interface DecisionAtlasOptions {
  /** The archive-page example, with its `atlas:` slot markers intact. */
  template: string;
  /** Records to publish; only `implemented/` and `archived/` are rendered. */
  records: AdrRecord[];
  graph: DecisionGraph;
  /** Commit the page is pinned to, as `git rev-parse --short HEAD` reports it. */
  commit: string;
  /** Browser URL of the repository, without a trailing slash. */
  repositoryUrl: string;
  /** Name the page gives the project. */
  projectName: string;
  /** Link from the published page back to the project home. */
  homeHref?: string;
}

/** One record as the example's client script reads it. */
interface AtlasRecord {
  status: string;
  date: string;
  'raised-by'?: string;
  'decided-by'?: string;
  created?: string;
  commit?: string;
  'superseded-by'?: number;
  'archive-reason'?: string;
  tags: string[];
  paths: string[];
  number: number;
  title: string;
  body: string;
  path: string;
  lifecycle: string;
  source: string;
}

function replaceSlot(template: string, open: string, close: string, value: string, name: string): string {
  const start = template.indexOf(open);
  const end = template.indexOf(close, start + open.length);
  if (start === -1 || end === -1) {
    throw new Error(`decision atlas template is missing the ${name} slot (${open} ... ${close})`);
  }
  return template.slice(0, start + open.length) + value + template.slice(end);
}

function replaceHtmlSlot(template: string, name: string, value: string): string {
  return replaceSlot(template, `<!-- atlas:${name} -->`, `<!-- /atlas:${name} -->`, value, name);
}

function replaceRecordsSlot(template: string, value: string): string {
  return replaceSlot(template, '/* atlas:records */', '/* /atlas:records */', value, 'records');
}

/** Rebuild the readable body from the parsed sections, without front matter. */
function markdownBody(record: AdrRecord): string {
  const heading = `\n# ADR: ${record.number} ${record.title}\n`;
  const sections = record.sections
    .map((entry) => `\n## ${entry.heading}\n\n${entry.body.trim()}\n`)
    .join('');
  return `${heading}${sections}`;
}

function shortDate(date: string | undefined): string {
  return date === undefined ? '' : date.slice(5);
}

function densityNote(records: AdrRecord[]): string {
  const dated = records.filter((record) => record.created !== undefined);
  if (dated.length === 0) return '还没有记录创建日期。';
  const days = new Map<string, number>();
  for (const record of dated) {
    const day = record.created!;
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  const dates = [...days.keys()].sort();
  const first = dates[0]!;
  const last = dates.at(-1)!;
  if (first === last) return `${dated.length} 条记录都立在 ${first}。`;
  const [busiest, count] = [...days.entries()].sort(
    ([aDate, aCount], [bDate, bCount]) => bCount - aCount || aDate.localeCompare(bDate),
  )[0]!;
  const burst = count > 1 ? `；${shortDate(busiest)} 一天就立下 ${count} 条` : '';
  const close = count >= 3 ? '，决策总在同一批工作里成串出现。' : '。';
  return `${dated.length} 条记录从 ${shortDate(first)} 写到 ${shortDate(last)}，落在 ${dates.length} 个不同的日子${burst}${close}`;
}

function inboundNote(graph: DecisionGraph, implemented: Set<number>): string {
  const inbound = new Map<number, number>();
  for (const edge of graph.referenceEdges) {
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }
  const top = [...inbound.entries()]
    .filter(([number]) => implemented.has(number))
    .sort(([aNumber, aCount], [bNumber, bCount]) => bCount - aCount || aNumber - bNumber)[0];
  if (top === undefined) return '记录之间还没有引用关系；图谱只呈现已经写下的关系。';
  return `被引最多的决策是后续工作的支点：#${top[0]} 被引 ${top[1]} 次；计数描述关系，不代表重要性。`;
}

function replacementsNote(archived: AdrRecord[]): string {
  if (archived.length === 0) return '还没有归档记录；当前约束以生效记录为准。';
  const superseded = archived.filter((record) => record.supersededBy !== undefined).length;
  return `已封存 ${archived.length} 条历史记录，其中 ${superseded} 条标注了接棒的继任者；当前约束以生效记录为准。`;
}

/**
 * Render the published decision atlas from the repository's current records.
 *
 * The page is self-contained and regenerated at site build time: records,
 * relationship map, statistics, prose, and source links all come from the same
 * commit. Archived bodies stay out of the payload; only their metadata and a
 * source link are published.
 */
export function renderDecisionAtlas(options: DecisionAtlasOptions): string {
  const { template, graph, commit, projectName } = options;
  const repositoryUrl = options.repositoryUrl.replace(/\/$/, '');
  const homeHref = options.homeHref ?? '../';
  const records = options.records.filter(
    (record) => record.folder === 'implemented' || record.folder === 'archived',
  );
  for (const record of records) {
    if (record.number === undefined) {
      throw new Error(`decision atlas cannot render an unnumbered record: ${record.path}`);
    }
  }
  records.sort((a, b) => a.number! - b.number!);
  const implemented = records.filter((record) => record.folder === 'implemented');
  const archived = records.filter((record) => record.folder === 'archived');

  const numberByPath = new Map(graph.nodes.map((node) => [node.path, node.number]));
  const drawing = renderDecisionMapSvg(graph, {
    recordHref: (recordPath) => `#adr-${numberByPath.get(recordPath)}`,
    nodeId: (number) => `adr-${number}`,
    dateCount: (count) => `${count} 条`,
  });

  const payload: AtlasRecord[] = records.map((record) => ({
    status: record.status,
    date: record.date,
    'raised-by': record.raisedBy,
    'decided-by': record.decidedBy,
    created: record.created,
    commit: record.commit,
    'superseded-by': record.supersededBy,
    'archive-reason': record.archiveReason,
    tags: record.tags ?? [],
    paths: record.paths ?? [],
    number: record.number!,
    title: record.title,
    body: record.folder === 'archived' ? '' : markdownBody(record),
    path: relativePath(record),
    lifecycle: record.folder,
    source: `${repositoryUrl}/blob/${commit}/${relativePath(record)}`,
  }));
  // The records live in a <script> block: escaping "<" keeps a record title or
  // body from closing the element; line separators are invalid in JS strings.
  const recordsJson = JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  const stats = `<section class="stats-band" aria-label="决策统计"><div class="stats-inner">`
    + `<div><strong>${implemented.length}</strong><span>生效决策</span></div>`
    + `<div><strong>${archived.length}</strong><span>归档历史</span></div>`
    + `<div><strong>${graph.referenceEdges.length}</strong><span>引用关系</span></div>`
    + `<div><strong>${graph.nodes.filter((node) => node.hasDeliberation).length}</strong><span>含推敲过程</span></div>`
    + `</div></section>`;

  const hero = `<section id="top" class="page-hero"><div class="hero-content">`
    + `<p class="eyebrow">DECISION ATLAS / LIVE ARCHIVE</p>`
    + `<h1>${escapeHtml(projectName)}</h1>`
    + `<p class="hero-description">从本仓库 adr/ 的 ${implemented.length} 条生效决策与 ${archived.length} 条归档历史生成。<br>每次站点构建重新读取记录，不保留手工快照。</p>`
    + `</div></section>`;

  const footer = `<footer class="page-footer"><span class="page-brand">${escapeHtml(projectName)} / ADR</span>`
    + `<div class="footer-meta">由 adrkit 在站点构建时生成 · 记录定格于 `
    + `<a class="footer-commit" href="${escapeHtml(`${repositoryUrl}/tree/${commit}`)}" target="_blank" rel="noopener noreferrer">${escapeHtml(commit)}</a>`
    + ` · <a class="footer-home" href="${escapeHtml(homeHref)}">项目主页</a></div></footer>`;

  let page = template;
  page = replaceHtmlSlot(page, 'title', `<title>${escapeHtml(projectName)} · 决策档案</title>`);
  page = replaceHtmlSlot(page, 'hero', hero);
  page = replaceHtmlSlot(page, 'stats', stats);
  page = replaceHtmlSlot(page, 'density-note', `<p class="section-note">${escapeHtml(densityNote(records))}</p>`);
  page = replaceHtmlSlot(
    page,
    'inbound-note',
    `<p class="section-note">${escapeHtml(inboundNote(graph, new Set(implemented.map((record) => record.number!))))}</p>`,
  );
  page = replaceHtmlSlot(page, 'replacements-note', `<p class="section-note">${escapeHtml(replacementsNote(archived))}</p>`);
  page = replaceHtmlSlot(page, 'map', drawing.svg);
  page = replaceHtmlSlot(page, 'footer', footer);
  page = replaceRecordsSlot(page, `\nconst records = ${recordsJson};\n`);
  return page;
}
