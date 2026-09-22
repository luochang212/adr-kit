import { RELATION_STYLE, RELATION_SCRIPT } from './relation-focus.js';
import type { DeliberationNode } from './deliberation.js';
import { isUnlockedQuestion } from './deliberation.js';
import { CANVAS_STYLE, CANVAS_SCRIPT, canvasHeaderHTML, canvasDockHTML } from './canvas-view.js';
import { TREE_STYLE, TREE_SCRIPT } from './deliberation-view.js';
import { SHARE_SCRIPT, SHARE_STYLE } from './share.js';
import { escapeHtml } from './view-text.js';

interface Card {
  id: string;
  node: DeliberationNode;
  kind: 'root' | 'question' | 'option' | 'virtual';
  parent: string;
  anchor: string;
  depth: number;
  options: Array<{ id: string; node: DeliberationNode }>;
  children: string[];
  unlocked: boolean;
}

function kindOf(node: DeliberationNode): 'question' | 'option' {
  return node.type ?? (node.children.length > 0 ? 'question' : 'option');
}

/** Only option children can be answers; a settled follow-up is not an answer. */
function overridden(card: Card): boolean {
  const chosen = card.options.filter(({ node }) => node.status === 'settled');
  return card.kind === 'question' && chosen.length > 0
    && card.options.some(({ node }) => node.recommended)
    && !chosen.some(({ node }) => node.recommended);
}

function reason(node: DeliberationNode): string {
  return node.reason === undefined ? '' : `<p class="reason">${escapeHtml(node.reason)}</p>`;
}

/**
 * The exception states, with the gloss the legend gives each one. `settled` is
 * absent on purpose: it is what a node is when nothing else is said, so a chip
 * would repeat the same word on every card.
 */
const STATE_LEGEND: Array<[string, string]> = [
  ['open', 'unresolved'],
  ['rejected', 'not taken'],
  ['unrecorded', 'no state marker'],
];

/** Render semantic cards on the server; the embedded script only lays them out. */
export function renderCardTree(nodes: DeliberationNode[], title: string): string {
  const cards: Card[] = [];
  let sequence = 0;
  function collect(node: DeliberationNode, parent = '', anchor = '', depth = 0): Card {
    const kind = depth === 0 && node.type === undefined ? 'root' : kindOf(node);
    const card: Card = { id: `n${++sequence}`, node, kind, parent, anchor, depth, options: [], children: [], unlocked: false };
    cards.push(card);
    for (const child of node.children) {
      if (kind !== 'option' && kindOf(child) === 'option') {
        const id = `n${++sequence}`;
        card.options.push({ id, node: child });
        for (const followup of child.children) {
          card.children.push(collect(followup, card.id, id, depth + 1).id);
        }
      } else {
        card.children.push(collect(child, card.id, '', depth + 1).id);
      }
    }
    return card;
  }
  // A session that settles several decisions records them as sibling roots,
  // which the canvas would draw as unrelated islands. Group them under one
  // presentational card; recorded roots keep their kind, depth, and content.
  // The card carries only its label: no heading, no count, no state.
  const virtual: Card | undefined = nodes.length > 1
    ? {
        id: `n${++sequence}`,
        node: { text: '', children: [] },
        kind: 'virtual', parent: '', anchor: '', depth: 0, options: [], children: [], unlocked: false,
      }
    : undefined;
  if (virtual !== undefined) cards.push(virtual);
  nodes.forEach((node) => {
    const card = collect(node, virtual?.id ?? '');
    virtual?.children.push(card.id);
  });
  // Whether each card's incoming edge is an unlocked one. The question is the
  // outline's, not the drawing's: the node that raised this card is the option
  // it anchors to, or the card it hangs off when it anchors to none. Asking it
  // here lets the drawn edge and the legend read one answer.
  const byId = new Map(cards.map((card) => [card.id, card]));
  const optionNodes = new Map(cards.flatMap((card) => card.options.map(({ id, node }) => [id, node] as const)));
  for (const card of cards) {
    const parent = byId.get(card.parent);
    if (parent === undefined || card.kind === 'virtual') continue;
    const anchor = optionNodes.get(card.anchor);
    card.unlocked = isUnlockedQuestion(
      card.node,
      anchor ?? parent.node,
      anchor === undefined && parent.kind === 'root',
    );
  }
  let questionNumber = 0;
  /** The states that actually draw a chip, so the legend keys only what it can point at. */
  const chipped = new Set<string>();
  const markup = cards.map((card) => {
    const { node, id, kind } = card;
    const override = overridden(card);
    const chosen = card.options.filter((option) => option.node.status === 'settled');
    const other = card.options.filter((option) => option.node.status !== 'settled');
    const status = node.status ?? 'unrecorded';
    // Only an exception earns a chip; a settled node already reads as settled
    // from its chosen answer, so the same word on every card would say nothing.
    const chip = kind !== 'virtual' && status !== 'settled';
    if (chip) chipped.add(status);
    const label = kind === 'question' ? `QUESTION ${String(++questionNumber).padStart(2, '0')}`
      : kind === 'virtual' ? 'DELIBERATION' : kind.toUpperCase();
    const stateChip = chip ? `<span class="state ${status}">${status}</span>` : '';
    // A folded option writes its state as plain text, not as a chip, so it earns
    // no legend key: the word is already readable and the pill is what needs one.
    const optionMarkup = (option: Card['options'][number]): string => {
      const selected = option.node.status === 'settled';
      const state = option.node.status ?? 'unrecorded';
      return `<div id="${option.id}" class="${selected ? 'answer' : 'alt'}" data-state="${state}">
        <span class="badge">${selected ? '✓ Selected' : escapeHtml(state)}${option.node.recommended ? ' · Agent recommended' : ''}</span>
        <p>${escapeHtml(option.node.text)}</p>${reason(option.node)}</div>`;
    };
    const heading = kind === 'virtual' ? '' : `<h2 id="${id}-title">${escapeHtml(node.text)}</h2>`;
    const labelledBy = kind === 'virtual' ? '' : ` aria-labelledby="${id}-title"`;
    const toggleLabel = kind === 'virtual' ? 'Toggle all decisions' : `Toggle follow-ups: ${escapeHtml(node.text)}`;
    return `<article id="${id}" class="card ${kind}" data-parent="${card.parent}" data-anchor="${card.anchor}" data-state="${status}" data-unlocked="${card.unlocked}" style="--depth:${card.depth}"${labelledBy}${kind === 'virtual' ? '' : ' tabindex="0"'}>
      <div class="cardhead"><div class="label"><span>${label}</span>${stateChip}</div>
      ${heading}${reason(node)}
      ${node.recommended ? '<p class="badge">Agent recommended</p>' : ''}
      ${override ? '<p class="override">Human override · recommendation not taken</p>' : ''}</div>
      ${chosen.map(optionMarkup).join('\n')}
      ${other.length === 0 ? '' : `<details class="alts"><summary>${other.length} other option${other.length === 1 ? '' : 's'}${override ? ' · includes recommendation' : ''}</summary>${other.map(optionMarkup).join('\n')}</details>`}
      ${card.children.length === 0 ? '' : `<button class="branch" aria-expanded="true" aria-controls="${card.children.join(' ')}" aria-label="${toggleLabel}">−</button>`}
    </article>`;
  }).join('\n');
  const overrides = cards.filter(overridden).length;
  const stats: Array<[string, number]> = [
    ['questions', questionNumber],
    ['options', cards.reduce((sum, card) => sum + card.options.length, 0)],
    ['overrides', overrides],
  ];
  // The legend quotes what the picture draws: an entry for something no card
  // shows sends the reader looking for it, so each one waits for its object.
  // The edge keys carry a line sample in the stroke the view draws, because a
  // dashed text dash looks like neither of the two edges it would be naming.
  const legend = [
    cards.some((card) => card.options.some(({ node }) => node.status === 'settled'))
      ? '<span data-share-selector=".card:not([hidden]) .answer">✓ Selected answer</span>' : '',
    cards.some((card) => card.parent !== '') ? '<span data-share-selector="#edges path[data-unlocked=false]"><i class="edge-key"></i>Raised by</span>' : '',
    cards.some((card) => card.unlocked) ? '<span data-share-selector="#edges path[data-unlocked=true]"><i class="edge-key unlocked"></i>Unlocked question</span>' : '',
    overrides === 0 ? '' : '<span class="override-key" data-share-selector=".card:not([hidden]) .override">● Human override</span>',
    ...STATE_LEGEND
      .filter(([state]) => chipped.has(state))
      .map(([state, gloss]) => `<span data-share-selector=".card:not([hidden]) .cardhead .state.${state}"><span class="state ${state}">${state}</span>${gloss}</span>`),
  ].filter(Boolean).join('');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — deliberation tree</title><style>${TREE_STYLE}${CANVAS_STYLE}${SHARE_STYLE}${RELATION_STYLE}</style></head>
<body>
${canvasHeaderHTML(title, stats, 'Hover or focus a card to trace its ancestors and follow-ups. Escape clears the highlight.')}
<main id="viewport" tabindex="0" aria-label="Decision tree" aria-describedby="instructions"><div id="world"><svg id="edges" aria-hidden="true"></svg><div id="cards">${markup}</div></div>
${canvasDockHTML(legend, 'Fit tree')}</main>
<noscript><p class="no-script">JavaScript is disabled. All cards are shown in outline order; expand other options to read their reasons.</p></noscript>
<script>${CANVAS_SCRIPT}${SHARE_SCRIPT}${TREE_SCRIPT}${RELATION_SCRIPT}</script>
</body></html>\n`;
}
