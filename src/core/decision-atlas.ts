import type { AdrRecord } from './adr.js';
import { ADR_KIT_REPOSITORY } from './brand.js';
import { translateAtlasMarkup, type AtlasLanguage } from './atlas-i18n.js';
import { selectAtlasTheme, type AtlasThemeSelection } from './atlas-theme.js';
import type { DecisionGraph } from './graph.js';
import { renderDecisionMapSvg } from './graph-html.js';
import { relativePath } from './repository.js';
import { escapeHtml } from './view-text.js';

// @adr 29, 31 — the build-time atlas and its full archived bodies.
/**
 * The replaceable regions in the shipped decision-atlas example. The example is
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
  /** The decision-atlas example, with its `atlas:` slot markers intact. */
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
  /** Page copy language; generated slot values and the static chrome follow it. */
  language?: AtlasLanguage;
  /** Choose a visual composition once; omitted selection rolls randomly. */
  theme?: AtlasThemeSelection;
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

function densityNote(records: AdrRecord[], language: AtlasLanguage): string {
  const en = language === 'en';
  const dated = records.filter((record) => record.created !== undefined);
  if (dated.length === 0) return en ? 'No record carries a created date yet.' : '还没有记录创建日期。';
  const days = new Map<string, number>();
  for (const record of dated) {
    const day = record.created!;
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  const dates = [...days.keys()].sort();
  const first = dates[0]!;
  const last = dates.at(-1)!;
  if (first === last) {
    if (en) {
      return dated.length === 1
        ? `1 record dates to ${first}.`
        : `${dated.length} records date to ${first}.`;
    }
    return `${dated.length} 条记录都立在 ${first}。`;
  }
  const [busiest, count] = [...days.entries()].sort(
    ([aDate, aCount], [bDate, bCount]) => bCount - aCount || aDate.localeCompare(bDate),
  )[0]!;
  if (en) {
    const burst = count > 1 ? `; ${shortDate(busiest)} alone produced ${count}` : '';
    const close = count >= 3 ? ', decisions arrive in batches.' : '.';
    const verb = dated.length === 1 ? 'runs' : 'run';
    return `${dated.length} record${dated.length === 1 ? '' : 's'} ${verb} from ${shortDate(first)} to ${shortDate(last)} across ${dates.length} distinct days${burst}${close}`;
  }
  const burst = count > 1 ? `；${shortDate(busiest)} 一天就立下 ${count} 条` : '';
  const close = count >= 3 ? '，决策总在同一批工作里成串出现。' : '。';
  return `${dated.length} 条记录从 ${shortDate(first)} 写到 ${shortDate(last)}，落在 ${dates.length} 个不同的日子${burst}${close}`;
}

function inboundNote(graph: DecisionGraph, implemented: Set<number>, language: AtlasLanguage): string {
  const inbound = new Map<number, number>();
  for (const edge of graph.referenceEdges) {
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }
  const top = [...inbound.entries()]
    .filter(([number]) => implemented.has(number))
    .sort(([aNumber, aCount], [bNumber, bCount]) => bCount - aCount || aNumber - bNumber)[0];
  if (top === undefined) {
    return language === 'en'
      ? 'No references between records yet; the map shows only relations that were written down.'
      : '记录之间还没有引用关系；决策地图只呈现已经写下的关系。';
  }
  return language === 'en'
    ? `The most-referenced decision anchors later work: #${top[0]} is referenced ${top[1]} time${top[1] === 1 ? '' : 's'}; the count describes relations, not importance.`
    : `被引最多的决策是后续工作的支点：#${top[0]} 被引 ${top[1]} 次；计数描述关系，不代表重要性。`;
}

function replacementsNote(archived: AdrRecord[], language: AtlasLanguage): string {
  const en = language === 'en';
  if (archived.length === 0) {
    return en
      ? 'No archived records yet; current constraints come from active records.'
      : '还没有归档记录；当前约束以生效记录为准。';
  }
  const superseded = archived.filter((record) => record.supersededBy !== undefined).length;
  // "5 条……其中 5 条" stutters when every archived record has a successor;
  // only the partial case needs the two counts.
  if (superseded === archived.length) {
    return en
      ? `Replaced choices do not disappear: ${archived.length} archived record${archived.length === 1 ? '' : 's'}${archived.length === 1 ? ' pointing to its successor' : ', each pointing to its successor'}; current constraints come from active records.`
      : `被替代的选择并不消失：${archived.length} 条记录已归档，每条都指向接棒的继任者；当前约束以生效记录为准。`;
  }
  return en
    ? `${archived.length} archived record${archived.length === 1 ? '' : 's'}, ${superseded} of them naming a successor; current constraints come from active records.`
    : `${archived.length} 条记录已归档，其中 ${superseded} 条标注了接棒的继任者；当前约束以生效记录为准。`;
}

/**
 * Render the published decision atlas from the repository's current records.
 *
 * The page is self-contained and regenerated at site build time: records,
 * decision map, statistics, prose, and source links all come from the same
 * commit. Archived bodies ship in the payload with their metadata; the
 * lifecycle field keeps them distinct from current authority.
 */
export function renderDecisionAtlas(options: DecisionAtlasOptions): string {
  const { template, graph, commit, projectName } = options;
  const language = options.language ?? 'zh';
  const theme = selectAtlasTheme(options.theme);
  const en = language === 'en';
  const repositoryUrl = options.repositoryUrl.replace(/\/$/, '');
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
    dateCount: (count) => (en ? `${count} record${count === 1 ? '' : 's'}` : `${count} 条`),
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
    body: markdownBody(record),
    path: relativePath(record),
    lifecycle: record.folder,
    source: repositoryUrl.length > 0
      ? `${repositoryUrl}/blob/${commit}/${relativePath(record)}`
      : '',
  }));
  // The records live in a <script> block: escaping "<" keeps a record title or
  // body from closing the element; line separators are invalid in JS strings.
  const recordsJson = JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  const stats = `<section class="stats-band" aria-label="${en ? 'Decision statistics' : '决策统计'}"><div class="stats-inner">`
    + `<div><strong>${implemented.length}</strong><span>${en ? 'Active decisions' : '生效决策'}</span></div>`
    + `<div><strong>${archived.length}</strong><span>${en ? 'Archived history' : '归档历史'}</span></div>`
    + `<div><strong>${graph.referenceEdges.length}</strong><span>${en ? 'References' : '引用关系'}</span></div>`
    + `<div><strong>${graph.nodes.filter((node) => node.hasDeliberation).length}</strong><span>${en ? 'Deliberation trees' : '含 deliberation tree'}</span></div>`
    + `</div></section>`;

  const hero = theme === 'signal'
    ? `<section id="top" class="page-hero"><div class="hero-content">`
    + `<p class="eyebrow">DECISION ATLAS / LIVE ARCHIVE</p>`
    + `<h1>${escapeHtml(projectName)}</h1>`
    + (en
      ? `<p class="hero-description">Generated from ${implemented.length} active decisions and ${archived.length} archived records in adr/.<br>Records are re-read at every site build; no manual snapshot.</p>`
      : `<p class="hero-description">从本仓库 adr/ 的 ${implemented.length} 条生效决策与 ${archived.length} 条归档历史生成。<br>每次站点构建重新读取记录，不保留手工快照。</p>`)
    + `</div></section>`
    : `<section id="top" class="page-hero"><div class="hero-content"><div class="hero-heading">`
    + `<p class="eyebrow">DECISION ATLAS / LIVE ARCHIVE</p>`
    + `<h1>${escapeHtml(projectName)}</h1></div><div class="hero-guide">`
    + (en
      ? `<p class="hero-description">The choices that shaped this project, and the reasons they changed.<br>Explore ${implemented.length} active decisions and ${archived.length} archived records through time, references, and their original text.</p>`
      : `<p class="hero-description">记录每一次选择，也保留被替代的理由。<br>沿着时间与引用，回看 ${implemented.length} 条生效决策和 ${archived.length} 条归档历史中的问题、判断与取舍。</p>`)
    + `<div class="hero-actions"><a class="primary-link" href="#cards-view">${en ? 'Browse records' : '记录目录'} <span aria-hidden="true">↗</span></a>`
    + `<a href="#decision-map">${en ? 'Explore the map' : '演进全景'} <span aria-hidden="true">↗</span></a></div>`
    + `</div></div></section>`;

  const commitLabel = repositoryUrl.length > 0
    ? `<a class="footer-commit" href="${escapeHtml(`${repositoryUrl}/tree/${commit}`)}" target="_blank" rel="noopener noreferrer">${escapeHtml(commit)}</a>`
    : `<span class="footer-commit">${escapeHtml(commit)}</span>`;
  // The generator's name links to the tool, not the repository being
  // documented; the commit link beside it already points at the target repo.
  const generator = `<a class="footer-repo" href="${ADR_KIT_REPOSITORY}" target="_blank" rel="noopener noreferrer">adr-kit</a>`;
  const footer = `<footer class="page-footer"><span class="page-brand">${escapeHtml(projectName)} / ADR</span>`
    + `<div class="footer-meta">${en ? `Generated by ${generator}` : `由 ${generator} 生成`} · ${en ? 'Records pinned at' : '记录定格于'} ${commitLabel}</div></footer>`;

  let page = en ? translateAtlasMarkup(template) : template;
  page = page.replace(/<html\b[^>]*>/i, (tag) =>
    tag.replace(/\sdata-atlas-theme=(['"]).*?\1/gi, '').slice(0, -1) + ` data-atlas-theme="${theme}">`);
  // Enable exactly one document stylesheet at generation time. Keeping the
  // page styles independent prevents Folio rules from changing Signal's layout.
  page = page.replace(/<style data-atlas-style="(folio|signal)"(?: media="not all")?>/g,
    (_, name: string) => `<style data-atlas-style="${name}"${name === theme ? '' : ' media="not all"'}>`);
  page = replaceHtmlSlot(page, 'title', `<title>${escapeHtml(projectName)} · ${en ? 'Decision atlas' : '决策档案'}</title>`);
  page = replaceHtmlSlot(page, 'hero', hero);
  page = replaceHtmlSlot(page, 'stats', stats);
  page = replaceHtmlSlot(page, 'density-note', `<p class="section-note">${escapeHtml(densityNote(records, language))}</p>`);
  page = replaceHtmlSlot(
    page,
    'inbound-note',
    `<p class="section-note">${escapeHtml(inboundNote(graph, new Set(implemented.map((record) => record.number!)), language))}</p>`,
  );
  page = replaceHtmlSlot(page, 'replacements-note', `<p class="section-note">${escapeHtml(replacementsNote(archived, language))}</p>`);
  page = replaceHtmlSlot(page, 'map', drawing.svg);
  page = replaceHtmlSlot(page, 'footer', footer);
  page = replaceRecordsSlot(page, `\nconst records = ${recordsJson};\n`);
  return page;
}
