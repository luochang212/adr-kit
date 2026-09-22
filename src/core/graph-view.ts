/** Map-specific inline styles; the viewer shell is shared with the tree. */
export const MAP_STYLE = String.raw`
svg {
  display: block
}
.node rect {
  fill: #fff;
  stroke-width: 1.5
}
.node .num {
  fill: #78877e;
  font-size: 11px;
  letter-spacing: .4px
}
.node .meta {
  fill: #8a978d;
  font-size: 10px
}
.node .title {
  fill: #233c36;
  font-size: 14px;
  font-weight: 600
}
.node .tag {
  fill: #7c8a80;
  font-size: 10px
}
.node.has-deliberation rect {
  fill: #edf6ef
}
.node.superseded rect {
  stroke-dasharray: 5 4
}
.node.superseded .title {
  fill: #8a938b
}
.node.superseded .num,
.node.superseded .meta {
  fill: #a2aba2
}
.node:hover rect {
  stroke-width: 2.5
}
.date-label {
  fill: #788b7b;
  font: 11px monospace;
  letter-spacing: 1px
}
.edge {
  fill: none
}
.edge.supersede {
  stroke: #294d3e;
  stroke-width: 2
}
.edge.reference {
  stroke: #b6c7ba;
  stroke-width: 1.4;
  stroke-dasharray: 5 4
}
.swatch {
  width: 24px;
  height: 0;
  border-top: 2px solid #294d3e
}
.swatch.ref {
  border-top: 1.5px dashed #b6c7ba
}
.swatch.delib {
  width: 18px;
  height: 12px;
  border: 1px solid #dce4dc;
  border-radius: 3px;
  background: #edf6ef
}
#world { position: relative; transform-origin: 0 0; }
main { overflow: auto; }
.empty { padding: 24px; }
`;
