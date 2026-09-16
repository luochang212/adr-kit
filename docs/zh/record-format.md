# 记录格式

每条 ADR 都是 YAML front matter 加 Markdown 正文：

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
decided-by: human | agent
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

front matter 字段按 `status`、`date`、`decided-by`、`created`、`commit`、
`superseded-by`、`reason`、`tags` 的顺序书写，只写适用的字段。`commit` 是该决策
对应的短 git hash，仓库处于 git 下时自动盖章。`superseded-by` 仅在
superseded 决策上必填，其他状态禁止出现。未知字段会被 `validate` 报告。

`date` 字段记录当前状态达成的日期。CLI 在每次生命周期迁移时自动盖章
（`decide`、`accept`、`supersede`），由机器写入，不靠人工维护。`created`
是创建日期，创建时盖一次、永不重盖，让时间轴在后续生命周期迁移后依然成立。
`tags` 是可选的 kebab-case 关键词列表（如 `frontend`、`execution-layer`），
`adrkit graph` 用它按主题分组和过滤决策；`validate` 只校验形状、从不要求必填。

## 人还是 agent：`decided-by`

`decided-by` 取值为 `human` 或 `agent`，accepted 与 superseded 决策必填；
草稿不带这个字段，带了会被 `validate` 拒绝。`decide` 与 `accept` 要求调用方用
`--decided-by human|agent` 声明它；`propose` 从不写，`supersede` 保留记录原有
的值。

`human` 表示方向由人决定：人给出的选择；或者 agent 提出、人改成了最终落地方案的
选择；或者人此前已经定过、agent 现在只是补记。`agent` 表示方向由 AI 自主判断得出。
人只是放行 agent 的提案、没有真正参与这个选择时，来源仍是 `agent`，记录就写
`agent`，人批准这一点写进正文。这个字段只回答"选择从哪来"一个问题——"谁"指选择的
来源，不是谁执行的命令——因此取值唯一、不做共同署名；谁提出、谁改写、谁批准属于正文
`## Decision` 的叙述，不放进 front matter。分不清时，先问再记。

这个值是声明，不是观测。CLI 既不推断也不校验它：环境、终端、会话标记都无法
暴露是谁做的选择，所以命令直接问调用方并记录答案。因此它的可信度低于客观观测的 `date` 与 `commit`，
也不能证明是谁自主拍板或批准决定。它会被随意的或虚假的声明击败——这类声明不会留下
任何可被检查发现的痕迹——也会被事后编辑文件击败，值可以任意改变。同样，
`accepted` 表示正式记录的决定，不代表
人已审阅批准。提交身份由 git 记录。

`validate` 从不回填这个字段：记录里没有 `decided-by` 就一直报缺少，直到知道这条
选择从哪来的人（agent 自己的判断，或给出方向的人）把值写上。校验本身只读。

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

`validate` 会校验被引用的编号存在且自身未被取代。被取代的记录留在
`adr/decisions/` 作为冻结历史。

## 被否决

被否决的想法不是独立记录。每条决策的 `Alternatives considered` 记录了
考虑过什么、为什么落选，所以"不"不会消失，也不会被反复争论。

## Slug 规则

Slug 保留 ASCII 字母、数字和 CJK 字符；其余字符转为短横线；最长 80 字符。
