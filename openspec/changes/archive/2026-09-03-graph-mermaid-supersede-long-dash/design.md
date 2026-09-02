# Design: Mermaid supersede edges as long dashes

## Context

`mermaidGraph()` 目前把 formal 边输出为 `  n1 ==>|superseded by| n11`，渲染即 Mermaid 默认粗实线；引用边为 `-.->`。生成器在末尾已经追加 `classDef` / `class` / `click` 等语句块（见 `src/core/graph.ts` 的 `blocks` 数组）。官网站点用同样的“长划区分 supersede、短划区分引用”的视觉语言，本 change 让 CLI 输出与之一致。

## Goals / Non-Goals

**Goals:**
- `--mermaid` 输出中每条 supersede 边呈现长划虚线，引用边不受影响。
- `==>` 语法、方向、`superseded by` 标签、`click` 链接全部不变。

**Non-Goals:**
- 不改 `--dot` / `--json`（两者无此渲染语义）。
- 不改官网 `Graph.astro`（已是目标样式）。
- 不引入 mermaid 配置/外部依赖。

## Decisions

- **用 `linkStyle <index> stroke-dasharray:11 7` 追加在输出末尾**，而不是把 `==>` 换成 `-.->` + 标签：`==>` 与 `-.->` 语义在 mermaid 读者中有普遍预期（formal vs mined），保留语法、仅覆盖描边，视觉与语义分离。
- **索引 = 该边在所有边（formal + references 拼接）声明数组中的下标**：mermaid 的 `linkStyle` 索引按整图边的声明顺序计。formal 边先于 references 输出，所以第 k 条 formal 边的索引就是 k（从 0 起）。用 `links.map` 重排以得出精确索引更稳妥——生成 `allEdges = [...formal, ...references]` 后对 formal 边按其 `allEdges.indexOf` 定位。全图至多几十条边，`indexOf` 的 O(n²) 可忽略，换来索引与 mermaid 引擎严格一致。
- **每条 formal 边独占一行 `linkStyle`**（不逗号合并多条），让输出可读、索引清晰。
- 选择 `11 7`（长划）：与官网 `Graph.astro` 的 dasharray 完全一致，避免再引入一套数值。

## Risks / Trade-offs

- **索引脆弱性**：`linkStyle` 按声明序绑定，用户手工编辑生成的 mermaid（增删边）会让样式错位。接受：CLI 面向程序生成、原样使用；design 记录该边界，不进 spec 承诺。
- mermaid 引擎对 `==>` 边应用 linkStyle 的行为已在 mermaid@11 实测通过（见官网验证）。
