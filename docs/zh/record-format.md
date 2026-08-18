# 记录格式

每条 ADR 都是纯 Markdown。前三行固定：

```markdown
# ADR: <title>
Status: proposed | accepted | rejected — <reason> | superseded by NNNN
```

没有 front matter，也没有特殊语法。

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

文件名：`NNNN-slug.md`。标题：`# ADR: NNNN <title>`。必需 section：

```markdown
## Problem
## Decision
## Alternatives considered
## Consequences
```

已接受决策中禁止出现提案时代的标题（`Proposal`、`Acceptance criteria`、
`Risks`、`Plan`、`Migration plan`）。

被取代的决策保持已接受形态，但状态行携带取代它的决策编号：

```markdown
Status: superseded by 0006
```

`validate` 会校验被引用的编号存在且自身未被取代。被取代的记录留在
`adr/decisions/` 作为冻结历史。

## 已拒绝提案（Rejected）

文件名：`YYYY-MM-DD-slug.md`。状态行携带拒绝原因：

```markdown
Status: rejected — 我们最终选择了 JSON 文件
```

必需 section：`Problem`、`Proposal`、`Alternatives considered`。已拒绝记录
是冻结历史，不应再编辑。

## Slug 规则

Slug 保留 ASCII 字母、数字和 CJK 字符；其余字符转为短横线；最长 80 字符。
