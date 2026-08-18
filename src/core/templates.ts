import { section, type AdrRecord } from './adr.js';

/** Proposal sections that survive the mechanical accept rewrite. */
const PRESERVED_SECTIONS = [
  'Problem',
  'Proposal',
  'Alternatives considered',
  'Acceptance criteria',
  'Risks',
];

/**
 * 把 config.yaml 的 context 注入模板：放在标题块之后、第一个 section 之前。
 * 解析器忽略游离文本（current 为 null 时不收集），accept 的机械改写也会
 * 丢弃它——注释只在草案期可见，正是写作者需要项目上下文的时刻。
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

export function proposalTemplate(title: string, context?: string): string {
  return `# ADR: ${title}
Status: proposed

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
  const padded = String(number).padStart(4, '0');
  return `# ADR: ${padded} ${title}
Status: accepted

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
  return `# ADR: ${title}
Status: rejected — ${reason}

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

  const padded = String(number).padStart(4, '0');
  return `# ADR: ${padded} ${proposal.title}
Status: accepted

## Problem

${problem.trim() || '_No problem recorded._'}

## Decision

${decision.trim() || '_No decision recorded._'}

## Alternatives considered

${alternatives.trim() || '_No alternatives recorded._'}

## Consequences

${consequences.join('\n')}\n`;
}

function sectionBody(record: AdrRecord, heading: string): string {
  return section(record, heading)?.trim() ?? '';
}

/**
 * Proposal sections that have no place in an accepted decision and would be
 * silently discarded by `proposalToDecision`. Callers should surface these so
 * a mechanical lifecycle move never loses content without warning.
 */
export function droppedSections(proposal: AdrRecord): string[] {
  return proposal.sections
    .map((candidate) => candidate.heading)
    .filter((heading) => !PRESERVED_SECTIONS.includes(heading));
}
