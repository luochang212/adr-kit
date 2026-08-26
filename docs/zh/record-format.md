# 记录格式

每条 ADR 都是 YAML front matter 加 Markdown 正文：

```markdown
---
status: accepted | superseded
date: YYYY-MM-DD
created: YYYY-MM-DD
commit: abc1234
tags: [frontend]
---

# ADR: N <title>
```

front matter 字段按 `status`、`date`、`created`、`commit`、`superseded-by`、
`reason`、`tags` 的顺序书写，只写适用的字段。`commit` 是该决策对应的短 git
hash，仓库处于 git 下时自动盖章。`superseded-by` 仅在 superseded 决策上必填，
其他状态禁止出现。未知字段会被 `validate` 报告。

`date` 字段记录当前状态达成的日期。CLI 在每次生命周期迁移时自动盖章
（`decide`、`accept`、`supersede`），由机器写入，不靠人工维护。`created`
是创建日期，创建时盖一次、永不重盖，让时间轴在后续生命周期迁移后依然成立。
`tags` 是可选的 kebab-case 关键词列表（如 `frontend`、`execution-layer`），
`adrkit graph` 用它按主题分组和过滤决策；`validate` 只校验形状、从不要求必填。

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
