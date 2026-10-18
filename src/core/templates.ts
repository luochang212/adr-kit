import { parse, stringify } from 'yaml';
import {
  FRONT_MATTER_ORDER,
  hasMeaningfulBody,
  PROPOSAL_ERA_HEADINGS,
  section,
  todayStamp,
  type AdrRecord,
  type DecidedBy,
  type RaisedBy,
} from './adr.js';

/** Proposal sections that survive the mechanical implementation rewrite. */
const PRESERVED_SECTIONS = [
  'Problem',
  'Proposal',
  'Alternatives considered',
  'Acceptance criteria',
  'Risks',
];

/**
 * Proposal-era leftovers the implementation rewrite cannot fold anywhere. The full
 * PROPOSAL_ERA_HEADINGS set is wider (it also names Proposal/Acceptance
 * criteria/Risks, which the rewrite folds into Decision/Consequences); only
 * these headings are genuinely dropped, with a warning.
 */
const DROPPED_SECTION_HEADINGS = PROPOSAL_ERA_HEADINGS.filter(
  (heading) => !PRESERVED_SECTIONS.includes(heading),
);

/**
 * 把 config.yaml 的 context 注入模板：放在标题块之后、第一个 section 之前。
 * 解析器忽略游离文本（current 为 null 时不收集），implement 的机械改写也会
 * 丢弃它。注释只在草案期可见，正是写作者需要项目上下文的时刻。
 */
function contextBlock(context?: string | null): string {
  const text = context?.trim() ?? '';
  // 空 context 不注入
  if (text.length === 0) return '';
  return `<!-- Project context (adr/config.yaml):
${text}
-->
`;
}

/** A front matter value: scalars plus the `tags` list. */
type FrontMatterValue = string | number | string[];

/**
 * The write-time rot rule, carried by the proposal and decision template
 * comments. Records are the memory of why; volatile facts belong to an owner
 * next to the code, and the record points at that owner. Field evidence: a
 * real site rediscovered this rule twice in its first three records — the
 * discipline is too valuable to leave to rediscovery.
 */
const POINTER_RULE = [
  'State the rule and its boundary, and point volatile facts — numbers,',
  'inventories, versions — at an owner next to the code (a ledger file, a',
  'config, a script header) instead of copying them: a record that mirrors',
  'code rots.',
].join('\n     ');

/**
 * The one-time authoring hint that propose and record print. Scope retrieval
 * (`adrkit relevant`) only matches records that declare `paths:`, and field
 * sites wrote none — the creation output is the one moment every author is
 * looking at the record, so the hint rides there instead of on validate.
 */
export const PATHS_TIP =
  'tip: a record governing specific files can declare optional "paths: [src/**]" in the\n' +
  '  front matter; "adrkit relevant <path>" retrieves scoped records';

/**
 * Render a YAML front matter block. Fields are written in the canonical
 * order from FRONT_MATTER_ORDER; only the fields
 * present in `fields` are emitted.
 */
export function frontMatter(fields: Record<string, FrontMatterValue>): string {
  const ordered: Record<string, FrontMatterValue> = {};
  for (const key of FRONT_MATTER_ORDER) {
    const value = fields[key];
    if (value !== undefined) ordered[key] = value;
  }
  return `---\n${stringify(ordered)}---\n`;
}

export function proposalTemplate(title: string, context?: string): string {
  return `${frontMatter({ status: 'proposed', date: todayStamp(), created: todayStamp() })}
# ADR: ${title}

${contextBlock(context)}## Problem

<!-- What problem or opportunity does this decision address? Why now? -->

## Proposal

<!-- The proposed decision. Be specific about what will change.
     ${POINTER_RULE} -->

## Alternatives considered

<!-- Each genuine alternative and why it lost. Keep this section: it is the
     part of a decision record that prevents re-litigating old choices. -->

## Acceptance criteria

<!-- Observable state that means the proposal is done. -->

## Risks

<!-- What could go wrong, and what the change knowingly gives up. -->
`;
}

/**
 * The decision skeleton. `decidedBy` is required, not optional: a durable
 * record without the field is invalid, so the only path that creates one must
 * name where the choice came from.
 */
export function decisionTemplate(
  number: number,
  title: string,
  context: string | undefined,
  commit: string | undefined,
  decidedBy: DecidedBy,
  raisedBy: RaisedBy,
): string {
  const fields: Record<string, string | number> = {
    status: 'implemented',
    date: todayStamp(),
    created: todayStamp(),
    'raised-by': raisedBy,
    'decided-by': decidedBy,
  };
  if (commit !== undefined) fields.commit = commit;
  return `${frontMatter(fields)}
# ADR: ${number} ${title}

${contextBlock(context)}## Problem

<!-- What problem or opportunity does this decision address? -->

## Decision

<!-- The decision that shipped, in present tense.
     ${POINTER_RULE} -->

## Alternatives considered

<!-- Each genuine alternative and why it lost. Keep this section: it is the
     part of a decision record that prevents re-litigating old choices. -->

## Consequences

<!-- What the trade-off cost and bought. -->
`;
}

/**
 * Convert a proposal into an implemented decision using the mechanical
 * rewrite the format requires: Proposal becomes Decision, and the
 * acceptance criteria and risks are folded into Consequences. `commit` anchors
 * the decision to the code state it was recorded against.
 *
 * `decidedBy` is the declaration made for the promoted decision, not the
 * proposal's: the front matter below is rebuilt from a fixed field map, so a
 * `decided-by` key written by hand into a proposal has no path into the decision.
 * It is required for the same reason the skeleton requires it: every durable
 * record has to name where the choice came from.
 */
export function proposalToDecision(
  proposal: AdrRecord,
  number: number,
  commit: string | undefined,
  decidedBy: DecidedBy,
  raisedBy: RaisedBy,
): string {
  const problem = sectionBody(proposal, 'Problem');
  const decision = sectionBody(proposal, 'Proposal');
  const alternatives = sectionBody(proposal, 'Alternatives considered');
  const acceptance = sectionBody(proposal, 'Acceptance criteria');
  const risks = sectionBody(proposal, 'Risks');

  const consequences: string[] = [];
  if (hasMeaningfulBody(acceptance)) {
    consequences.push('### Verification', '', acceptance, '');
  }
  if (hasMeaningfulBody(risks)) {
    consequences.push('### Trade-offs', '', risks, '');
  }
  if (consequences.length === 0) {
    consequences.push('_No consequences recorded._', '');
  }

  // Extra sections (for example `## Implementation`) are neither canonical
  // decision sections nor proposal-era leftovers, so they are carried through
  // the rewrite verbatim (appended after the canonical sections) instead of
  // being dropped: a lifecycle move must never lose written content silently.
  const passthrough = proposal.sections.filter(
    (candidate) =>
      !PRESERVED_SECTIONS.includes(candidate.heading) &&
      !DROPPED_SECTION_HEADINGS.includes(candidate.heading),
  );

  const fields: Record<string, FrontMatterValue> = {
    status: 'implemented',
    date: todayStamp(),
    // The decision inherits the proposal's birth date: created is stamped
    // once, at propose time, and survives the promotion.
    created: proposal.created ?? todayStamp(),
    'raised-by': raisedBy,
    'decided-by': decidedBy,
  };
  // Tags are a writer's keywords, not a lifecycle field: the promotion must
  // not quietly drop the ones the draft carried. A paths: scope is the same
  // kind of writer declaration — the files a record governs outlive the
  // promotion and must travel with it.
  if (proposal.tags !== undefined) fields.tags = proposal.tags;
  if (proposal.paths !== undefined) fields.paths = proposal.paths;
  if (commit !== undefined) fields.commit = commit;
  let output = `${frontMatter(fields)}
# ADR: ${number} ${proposal.title}

## Problem

${problem.trim() || '_No problem recorded._'}

## Decision

${decision.trim() || '_No decision recorded._'}

## Alternatives considered

${alternatives.trim() || '_No alternatives recorded._'}

## Consequences

${consequences.join('\n')}\n`;
  for (const extra of passthrough) {
    const body = extra.body.trim();
    output += body.length > 0 ? `\n## ${extra.heading}\n\n${body}\n` : `\n## ${extra.heading}\n`;
  }
  return output;
}

function sectionBody(record: AdrRecord, heading: string): string {
  return section(record, heading)?.trim() ?? '';
}

/**
 * Proposal sections that have no place in an implemented decision and would be
 * silently discarded by `proposalToDecision`. Only proposal-era leftovers
 * (for example `Plan`, `Migration plan`) qualify; every other extra section
 * is carried through the rewrite. Callers should surface these so a
 * mechanical lifecycle move never loses content without warning.
 */
export function droppedSections(proposal: AdrRecord): string[] {
  return proposal.sections
    .map((candidate) => candidate.heading)
    .filter((heading) => DROPPED_SECTION_HEADINGS.includes(heading));
}

/**
 * Rewrite a record's front matter for a lifecycle move: parse the existing
 * block, merge `patch` over it, and re-emit the fields in canonical order.
 * Supersede stamps only the retiring record and its immediate successor link;
 * earlier records keep their historical links when the chain grows.
 * Every lifecycle move (implement, reject, archive, supersede) must stamp the date so
 * the front matter always reflects the current status; the Markdown body is
 * left untouched. Only canonical fields survive: a key outside
 * `FRONT_MATTER_ORDER` is dropped rather than copied through, because writing
 * back a field this version does not understand would hide a version mismatch
 * instead of surfacing it. `validate` reports those keys, so the record is
 * fixed before any lifecycle move rewrites it. A canonical field the move does
 * not patch is carried over in full, including the `tags` list — a lifecycle
 * move must never lose a field the writer set.
 */
export function stampLifecycleMove(content: string, patch: Record<string, FrontMatterValue>): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match === null) {
    throw new Error('record has no YAML front matter block');
  }
  const existing = parse(match[1] ?? '') as Record<string, unknown>;
  const merged: Record<string, FrontMatterValue> = {};
  for (const key of FRONT_MATTER_ORDER) {
    const patched = patch[key];
    if (patched !== undefined) {
      merged[key] = patched;
      continue;
    }
    const kept = existing[key];
    if (typeof kept === 'string' || typeof kept === 'number') merged[key] = kept;
    else if (Array.isArray(kept) && kept.every((entry) => typeof entry === 'string')) {
      merged[key] = kept as string[];
    }
  }
  return `---\n${stringify(merged)}---${content.slice(match[0].length)}`;
}
