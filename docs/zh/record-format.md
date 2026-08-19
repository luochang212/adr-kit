# 记录格式

每条 ADR 都是 YAML front matter 加 Markdown 正文：

```markdown
---
status: proposed | accepted | rejected | superseded
date: YYYY-MM-DD
---

# ADR: <title>
```

front matter 字段按 `status`、`date`、`reason`、`superseded-by` 的顺序书写，
只写适用的字段。`reason` 仅在 rejected 记录上必填，其他状态禁止出现；
`superseded-by` 仅在 superseded 决策上必填，其他状态禁止出现。未知字段
会被 `validate` 报告。

`date` 字段记录当前状态达成的日期。CLI 在每次生命周期迁移时自动盖章
（`propose`、`decide`、`accept`、`reject`、`supersede`），由机器写入，
不靠人工维护。

## 提案（Proposed）

文件名：`YYYY-MM-DD-slug.md`。必需 section：

```markdown
## Problem
## Proposal
## Alternatives considered
## Acceptance criteria
## Risks
```

`## Alternatives considered` 在去掉 HTML 注释后必须至少有一条真实备选方案。

## 已接受决策（Accepted）

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

## 已拒绝提案（Rejected）

文件名：`YYYY-MM-DD-slug.md`。front matter 携带拒绝原因：

```markdown
---
status: rejected
date: 2026-08-19
reason: 我们最终选择了 JSON 文件
---
```

必需 section：`Problem`、`Proposal`、`Alternatives considered`。已拒绝记录
是冻结历史，不应再编辑。

## Slug 规则

Slug 保留 ASCII 字母、数字和 CJK 字符；其余字符转为短横线；最长 80 字符。
