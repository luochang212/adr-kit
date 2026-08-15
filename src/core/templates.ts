import type { AdrRecord } from './adr.js';

export function proposalTemplate(title: string): string {
  return `# ADR: ${title}
Status: proposed

## Problem

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

export function decisionTemplate(number: number, title: string): string {
  const padded = String(number).padStart(4, '0');
  return `# ADR: ${padded} ${title}
Status: accepted

## Problem

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

${consequences.join('\n')}`;
}

function sectionBody(record: AdrRecord, heading: string): string {
  return record.sections.find((candidate) => candidate.heading === heading)?.body.trim() ?? '';
}
