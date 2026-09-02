# Proposal: Mermaid supersede edges as long dashes

## Why

adr-kit 的官网决策图谱把 supersede 边画成长划虚线，与引用边的短划在视觉上区分、同时不突兀；但真实 CLI 的 `--mermaid` 输出里 supersede 边仍是 Mermaid 默认的粗实线（`==>`），两处视觉不一致。粗实线在节点密集的全宽图上显得突兀，且与引用虚线缺乏统一的笔触语言。

## What Changes

- `adrkit graph --mermaid` 在输出末尾为每条 formal supersede 边追加一条 `linkStyle` 语句，把它渲染为长划虚线（`stroke-dasharray: 11 7`），与官网决策图谱的呈现一致。
- supersede 边的 `==>|superseded by|` 语法、方向与标签保持不变；`linkStyle` 只覆盖该边的描边样式。
- 引用边（`-.->`）不受影响，维持 Mermaid 默认点线渲染。
- `--dot` 与 `--json` 输出不变。
- 已知代价（记录于 design）：`linkStyle` 按边的声明顺序索引，若用户手改图增删边会导致样式错位；这是程序生成图的既定输出，接受该脆弱性。

## Capabilities

### New Capabilities
_无_

### Modified Capabilities
- `decision-graph`: formal supersede edges 的 Mermaid 呈现由粗实线改为长划虚线（经 linkStyle），supersede 语义与标签不变。

## Impact

- `src/core/graph.ts` 的 `mermaidGraph()`：追加 linkStyle 生成逻辑。
- graph 相关单元测试需更新/新增断言。
- 官网 `site/src/components/Graph.astro` 无需改动（已使用同款长划）。
