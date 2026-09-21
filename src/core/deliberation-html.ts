import type { DeliberationNode } from './deliberation.js';
import { TREE_STYLE, TREE_SCRIPT } from './deliberation-view.js';

interface Card {
  id: string;
  node: DeliberationNode;
  kind: 'root' | 'question' | 'option';
  parent: string;
  anchor: string;
  depth: number;
  options: Array<{ id: string; node: DeliberationNode }>;
  children: string[];
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

/** Render semantic cards on the server; the embedded script only lays them out. */
export function renderCardTree(nodes: DeliberationNode[], title: string): string {
  const cards: Card[] = [];
  let sequence = 0;
  function collect(node: DeliberationNode, parent = '', anchor = '', depth = 0): Card {
    const kind = depth === 0 && node.type === undefined ? 'root' : kindOf(node);
    const card: Card = { id: `n${++sequence}`, node, kind, parent, anchor, depth, options: [], children: [] };
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
  nodes.forEach((node) => collect(node));
  let questionNumber = 0;
  const markup = cards.map((card) => {
    const { node, id, kind } = card;
    const override = overridden(card);
    const chosen = card.options.filter((option) => option.node.status === 'settled');
    const other = card.options.filter((option) => option.node.status !== 'settled');
    const status = node.status ?? 'unrecorded';
    const label = kind === 'question' ? `QUESTION ${String(++questionNumber).padStart(2, '0')}` : kind.toUpperCase();
    const optionMarkup = (option: Card['options'][number]): string => {
      const selected = option.node.status === 'settled';
      const state = option.node.status ?? 'unrecorded';
      return `<div id="${option.id}" class="${selected ? 'answer' : 'alt'}" data-state="${state}">
        <span class="badge">${selected ? '✓ Selected' : escapeHtml(state)}${option.node.recommended ? ' · Agent recommended' : ''}</span>
        <p>${escapeHtml(option.node.text)}</p>${reason(option.node)}</div>`;
    };
    return `<article id="${id}" class="card ${kind}" data-parent="${card.parent}" data-anchor="${card.anchor}" data-state="${status}" style="--depth:${card.depth}" aria-labelledby="${id}-title">
      <div class="cardhead"><div class="label"><span>${label}</span><span class="state ${status}">${status}</span></div>
      <h2 id="${id}-title">${escapeHtml(node.text)}</h2>${reason(node)}
      ${node.recommended ? '<p class="badge">Agent recommended</p>' : ''}
      ${override ? '<p class="override">Human override · recommendation not taken</p>' : ''}</div>
      ${chosen.map(optionMarkup).join('\n')}
      ${other.length === 0 ? '' : `<details class="alts"><summary>${other.length} other option${other.length === 1 ? '' : 's'}${override ? ' · includes recommendation' : ''}</summary>${other.map(optionMarkup).join('\n')}</details>`}
      ${card.children.length === 0 ? '' : `<button class="branch" aria-expanded="true" aria-controls="${card.children.join(' ')}" aria-label="Toggle follow-ups: ${escapeHtml(node.text)}">−</button>`}
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — deliberation tree</title><style>${TREE_STYLE}</style></head>
<body>
<header><div class="brand"><span class="logo" aria-hidden="true">↳</span> ADR Kit <small>DECISION EXPLORER</small></div><button id="all" class="js-control">Expand all options</button></header>
<section class="intro"><div><div class="eyebrow">DELIBERATION / DESIGN TREE</div><h1>${escapeHtml(title)}</h1><p>Follow the choices. See what each answer unlocked.</p></div>
<div class="stats"><div><strong>${questionNumber}</strong><span>questions</span></div><div><strong>${cards.reduce((sum, card) => sum + card.options.length, 0)}</strong><span>options</span></div><div><strong>${cards.filter(overridden).length}</strong><span>overrides</span></div></div></section>
<main id="viewport" tabindex="0" aria-label="Decision tree" aria-describedby="instructions"><div id="world"><svg id="edges" aria-hidden="true"></svg><div id="cards">${markup}</div></div>
<div id="instructions" class="hint">Drag background or scroll to pan · Arrow keys to move · + / − to zoom · 0 to fit</div>
<div class="controls js-control"><button id="minus" aria-label="Zoom out">−</button><output id="zoom" aria-label="Zoom level">100%</output><button id="plus" aria-label="Zoom in">+</button><button id="fit">Fit tree</button><button id="reset">1:1</button></div></main>
<footer><span>ADR Kit / Deliberation</span><div class="legend"><span>✓ Selected answer</span><span>— Unlocked question</span><span class="override-key">● Human override</span></div></footer>
<noscript><p class="no-script">JavaScript is disabled. All cards are shown in outline order; expand other options to read their reasons.</p></noscript>
<script>${TREE_SCRIPT}</script>
</body></html>\n`;
}
