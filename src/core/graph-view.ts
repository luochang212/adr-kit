/** Inline assets for the offline decision map. No network or runtime dependency. */
export const MAP_STYLE = String.raw`

:root {
  font-family: Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color: #233c36;
  background: #f6f8f5
}
* {
  box-sizing: border-box
}
body {
  margin: 0
}
a {
  color: inherit
}
header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid #e1e7e1;
  gap: 14px
}
.brand {
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -.5px;
  display: flex;
  align-items: center;
  gap: 10px
}
.logo {
  background: #284f40;
  color: #fff;
  border-radius: 8px;
  padding: 6px 9px;
  font-family: monospace
}
.brand small {
  font-size: 11px;
  color: #728079;
  font-weight: 500;
  letter-spacing: 1px;
  margin-left: 14px
}
.intro {
  padding: 24px 32px 6px
}
.eyebrow {
  color: #788b7b;
  letter-spacing: 2px;
  font: 11px monospace;
  margin-bottom: 8px
}
h1 {
  font-size: 23px;
  letter-spacing: -.6px;
  margin: 0;
  font-weight: 650
}
.intro p {
  font-size: 12px;
  color: #718078;
  margin: 8px 0 0
}
.stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px
}
.stat {
  background: #fff;
  border: 1px solid #e1e7e1;
  border-radius: 10px;
  padding: 8px 13px;
  font-size: 11px;
  color: #728079
}
.stat strong {
  color: #233c36;
  font-size: 15px;
  font-weight: 600;
  margin-right: 5px
}
main {
  padding: 8px 20px 26px;
  overflow-x: auto
}
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
.node .badge {
  fill: #387456;
  font-size: 10px
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
footer {
  padding: 16px 32px 30px;
  color: #87928a;
  font-size: 10px
}
.legend {
  display: flex;
  gap: 18px;
  flex-wrap: wrap
}
.legend span {
  display: flex;
  align-items: center;
  gap: 7px
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
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 3px;
  background: #edf6ef
}
`;
