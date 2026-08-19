import { parse, stringify } from 'yaml';
import {
  FRONT_MATTER_ORDER,
  PROPOSAL_ERA_HEADINGS,
  section,
  todayStamp,
  type AdrRecord,
} from './adr.js';

/** Proposal sections that survive the mechanical accept rewrite. */
const PRESERVED_SECTIONS = [
  'Problem',
  'Proposal',
  'Alternatives considered',
  'Acceptance criteria',
  'Risks',
];

/**
 * Proposal-era leftovers the accept rewrite cannot fold anywhere. The full
 * PROPOSAL_ERA_HEADINGS set is wider (it also names Proposal/Acceptance
 * criteria/Risks, which the rewrite folds into Decision/Consequences); only
 * these headings are genuinely dropped, with a warning.
 */
const DROPPED_SECTION_HEADINGS = PROPOSAL_ERA_HEADINGS.filter(
  (heading) => !PRESERVED_SECTIONS.includes(heading),
);

/**
 * 把 config.yaml 的 context 注入模板：放在标题块之后、第一个 section 之前。
 * 解析器忽略游离文本（current 为 null 时不收集），accept 的机械改写也会
 * 丢弃它。注释只在草案期可见，正是写作者需要项目上下文的时刻。
 */
function contextBlock(context?: string | null): string {
  const text = context?.trim() ?? '';
  // 空 context 或纯占位注释（老 init 模板遗留）都不注入
  if (text.length === 0 || text.startsWith('<!--')) return '';
  return `<!-- Project context (adr/config.yaml):
${text}
-->
`;
}

/**
 * Render a YAML front matter block. Fields are written in the canonical
 * order (status, date, reason, superseded-by); only the fields present in
 * `fields` are emitted.
 */
export function frontMatter(fields: Record<string, string | number>): string {
  const ordered: Record<string, string | number> = {};
  for (const key of FRONT_MATTER_ORDER) {
    const value = fields[key];
    if (value !== undefined) ordered[key] = value;
  }
  return `---\n${stringify(ordered)}---\n`;
}

export function proposalTemplate(title: string, context?: string): string {
  return `${frontMatter({ status: 'proposed', date: todayStamp() })}
# ADR: ${title}

${contextBlock(context)}## Problem

<!-- What problem or opportunity does this decision address? Why now? -->

## Proposal

<!-- The proposed decision. Be specific about what will change. -->

## Alternatives considered

<!-- Each genuine alternative and why it lost. Keep this section: it is the
     part of a decision record that prevents re-litigating old choices. -->

## Acceptance criteria

<!-- Observable state that means the proposal is done. -->

## Risks

<!-- What could go wrong, and what the change knowingly gives up. -->
`;
}

export function decisionTemplate(number: number, title: string, context?: string): string {
  return `${frontMatter({ status: 'accepted', date: todayStamp() })}
# ADR: ${number} ${title}

${contextBlock(context)}## Problem

<!-- What problem or opportunity does this decision address? -->

## Decision

<!-- The decision that shipped, in present tense. -->

## Alternatives considered

<!-- Each genuine alternative and why it lost. Keep this section: it is the
     part of a decision record that prevents re-litigating old choices. -->

## Consequences

<!-- What the trade-off cost and bought. -->
`;
}

export function rejectedTemplate(title: string, reason: string): string {
  return `${frontMatter({ status: 'rejected', date: todayStamp(), reason })}
# ADR: ${title}

## Problem

<!-- What problem or opportunity was this proposal addressing? -->

## Proposal

<!-- The rejected proposal. -->

## Alternatives considered

<!-- Each genuine alternative and why it lost. -->
`;
}

/**
 * Convert a proposal into an accepted decision using the same mechanical
 * rewrite the format requires: Proposal becomes Decision, and the
 * acceptance criteria and risks are folded into Consequences.
 */
export function proposalToDecision(proposal: AdrRecord, number: number): string {
  const problem = sectionBody(proposal, 'Problem');
  const decision = sectionBody(proposal, 'Proposal');
  const alternatives = sectionBody(proposal, 'Alternatives considered');
  const acceptance = sectionBody(proposal, 'Acceptance criteria');
  const risks = sectionBody(proposal, 'Risks');

  const consequences: string[] = [];
  if (acceptance.trim().length > 0) {
    consequences.push('### Acceptance criteria', '', acceptance.trim(), '');
  }
  if (risks.trim().length > 0) {
    consequences.push('### Risks', '', risks.trim(), '');
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

  let output = `${frontMatter({ status: 'accepted', date: todayStamp() })}
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
 * Proposal sections that have no place in an accepted decision and would be
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
 * Every non-creating move (accept, reject, supersede) must stamp the date so
 * the front matter always reflects the current status; the Markdown body is
 * left untouched. Unknown keys are preserved after the canonical ones so a
 * mechanical rewrite never loses data silently (validate flags them).
 */
export function stampLifecycleMove(content: string, patch: Record<string, string | number>): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match === null) {
    throw new Error('record has no YAML front matter block');
  }
  const existing = parse(match[1] ?? '') as Record<string, unknown>;
  const merged: Record<string, string | number> = {};
  for (const key of FRONT_MATTER_ORDER) {
    const patched = patch[key];
    if (patched !== undefined) {
      merged[key] = patched;
      continue;
    }
    const kept = existing[key];
    if (typeof kept === 'string' || typeof kept === 'number') {
      merged[key] = kept;
    }
  }
  for (const [key, value] of Object.entries(existing)) {
    if ((FRONT_MATTER_ORDER as readonly string[]).includes(key)) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      merged[key] = value;
    }
  }
  return `---\n${stringify(merged)}---${content.slice(match[0].length)}`;
}
