# 记录格式

每条 ADR 都是 YAML front matter 加 Markdown 正文：

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
raised-by: human | agent
decided-by: human | agent
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

front matter 字段按 `status`、`date`、`raised-by`、`decided-by`、`created`、
`commit`、`superseded-by`、`reason`、`tags` 的顺序书写，只写适用的字段。`commit` 是该决策
所记录代码状态的短 git hash，仓库处于 git 下时自动盖章；后续每次生命周期迁移都会
把它重盖为那一次迁移的状态。`superseded-by` 仅在
superseded 决策上必填，其他状态禁止出现。未知字段会被 `validate` 报告。

`date` 字段记录当前状态达成的日期。CLI 在每次生命周期迁移时自动盖章
（`decide`、`accept`、`supersede`），由机器写入，不靠人工维护。`created`
是创建日期，创建时盖一次、永不重盖，让时间轴在后续生命周期迁移后依然成立。
`tags` 是可选的 kebab-case 关键词列表（如 `frontend`、`execution-layer`），
`adrkit graph` 用它按主题分组和过滤决策；`validate` 只校验形状、从不要求必填，
每次生命周期迁移都会保留该列表。

## 谁发起、谁定夺：`raised-by` 与 `decided-by`

持久记录携带两个来源字段，取值都是 `human` 或 `agent`，accepted 与 superseded
决策均必填；草稿两个都不带，带了 `accept` 会拒绝提升。`decide` 与 `accept`
要求调用方用 `--raised-by human|agent` 与 `--decided-by human|agent` 声明它；
`propose` 从不写，`supersede` 保留记录原有的值。

`raised-by` 是"谁把这条决策提上台面"，`decided-by` 是"谁的判断定下了它"。两者
相互独立：人可以提出、由 agent 定夺，也可以由 agent 提出、由人定夺，所以任意组合都
合法。

`decided-by` 取 `human` 表示方向由人决定：人给出的选择；或者 agent 提出、人改成了
最终落地方案的选择；或者人此前已经定过、agent 现在只是补记。`agent` 表示方向由 AI
自主判断得出。人只是放行 agent 的提案、没有真正参与这个选择时，来源仍是 `agent`，
记录就写 `agent`，人批准这一点写进正文。每个字段只回答一个问题——`raised-by` 问
议题从谁那里来，`decided-by` 问最终判断反映谁的意志——因此每项取值唯一、不做共同
署名。装不进单个值的叙述——谁改写、谁批准——属于正文 `## Decision`，不放进 front
matter。分不清时，先问再记。

这两个值都是声明，不是观测。CLI 既不推断也不校验：环境、终端、会话标记都无法暴露
是谁做的选择，所以命令直接问调用方并记录答案。因此它的可信度低于客观观测的 `date`
与 `commit`，也不能证明是谁自主拍板或批准决定。它会被随意的或虚假的声明击败——
这类声明不会留下任何可被检查发现的痕迹——也会被事后编辑文件击败，值可以任意改变。
同样，`accepted` 表示正式记录的决定，不代表人已审阅批准。提交身份由 git 记录。

`validate` 只读：缺 `raised-by`、`decided-by` 或取值未知时报告问题，从不代写，
因为只有调用方才能做出这些声明。

## 草稿（提案）

文件名：`YYYY-MM-DD-slug.md`，位置 `adr/.drafts/`。front matter：
`status: proposed`。必需 section：

```markdown
## Problem
## Proposal
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Alternatives considered` 在去掉 HTML 注释后必须至少有一条真实备选方案。
注释内的文字不算内容，未闭合的 `<!--` 会吞掉该 section 的其余部分
（CommonMark 对注释块到达其上下文末尾的读法），因此只有标记、外面没有文字
不算通过；所有“必须包含实际内容”的规则都按同一方式判定。

草稿是临时的，不在 `validate` 的检查范围内：`adrkit accept` 在把它提升为
决策之前才校验草稿，`adrkit reject` 则直接丢弃、不留记录。

## 决策（Accepted / Superseded）

文件名：`N-slug.md`。标题：`# ADR: N <title>`。必需 section：

```markdown
## Problem
## Decision
## Alternatives considered
## Consequences
```

已接受决策中禁止出现提案时代的标题（`Proposal`、`Acceptance criteria`、
`Risks`、`Plan`、`Migration plan`）。

被取代的决策保持已接受形态，但 front matter 携带取代它的决策编号：

```markdown
---
status: superseded
date: 2026-08-19
superseded-by: 6
---
```

`validate` 沿完整替代链检查每个目标均存在、没有循环，且最终到达 accepted 决策。
允许 `1 → 2 → 3` 这样的连续替代，保留历史链接而不改成直接指向最新决策。被取代的记录留在
`adr/decisions/` 作为冻结历史。

## 交叉引用

记录正文可以用 `ADR-N` 或 `ADR N` 指向另一条决策。这些引用就是 `adrkit graph`
画成虚线的边；`adrkit validate` 会报告指向不存在编号的引用，记录自身的编号不算
引用。front matter 里的 `superseded-by` 按同样规则校验。

## Deliberation 附录

决策可以携带可选的 `## Deliberation` 附录：记录选择背后的 design tree，用嵌套
Markdown 列表存储。一个节点是
`- [Q: | A: ]<text>[ [status]][ (recommended)][ — <reason>]`：`Q:`/`A:` 标注
问题或选项（可省略，按有无子节点推断），`[settled]` / `[rejected]` / `[open]`
是状态，`(recommended)` 标注 agent 推荐的选项，` — <reason>` 写理由；带空格的
em dash 是唯一的分隔符，正文里的连字符就是普通文本；出现多次时，第一个开始理由。
依赖靠嵌套表达：后续问题嵌在
提出它的节点之下，因此相关问题更深、无关问题平铺。问题的
答案是它的 `[settled]` 选项子节点（已定的后续问题不算答案）；若树里同时标了推荐
选项、而该选项子节点不是它，问题会标为 override。`adrkit tree <name>` 默认渲染为文本，加 `--mermaid` 输出 mermaid 图，
加 `--html` 输出离线交互卡片树，并突出显示"提出下一个问题"的那条边。
HTML 把问题和选中答案放在同一卡片中，其他选项可展开；卡片只在状态属于例外
（`open` / `rejected` / 未标注）时才显示状态徽章，因为选中的答案已经说明了
`settled`，而折叠区里的选项把状态写成纯文本。连线只有两种样式：所有依赖用的灰色
连线，以及已定选择赋予其后续问题的绿色连线。图例只解释画面上真正画出的符号，边键
用与所命名线条相同的笔触画出线段样本；画面上没有任何可解释的符号时，整个图例面板
都不画。这只是视图，不改变大纲语法。树本身从不以
mermaid 源码存储。任务开始时的查阅规则把这个附录当作参考资料，只在相关决策被
牵动时才读。

## 被否决

被否决的想法不是独立记录。每条决策的 `Alternatives considered` 记录了
考虑过什么、为什么落选，所以"不"不会消失，也不会被反复争论。

## Slug 规则

Slug 保留 ASCII 字母、数字和 CJK 字符；其余字符转为短横线；最长 80 字符。
