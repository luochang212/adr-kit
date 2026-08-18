# 工作流

## 提案优先

```text
adrkit init
adrkit propose "使用 SQLite 存储会话"
# 填写草稿
adrkit validate
adrkit accept "使用 SQLite 存储会话"
```

`adrkit accept` 会自动完成生命周期迁移所要求的改写：

- `## Proposal` 改为 `## Decision`
- `Acceptance criteria` 和 `Risks` 合并进 `## Consequences`
- 文件从 `adr/proposed/` 移动到 `adr/decisions/N-slug.md`

## 拒绝提案

```text
adrkit reject "使用 SQLite 存储会话" --reason "我们最终选择了 JSON 文件"
```

提案冻结在 `adr/rejected/`，原因写入状态行。

## 取代一条已接受决策

决策会被推翻。先记录替代决策，再退役过时记录：

```text
adrkit decide "使用 Postgres 存储会话"
# 填写新决策并校验
adrkit supersede 1 --by 2
```

旧记录留在 `adr/decisions/`，状态行为 `Status: superseded by 2`。
只改写状态行和 `Date:` 盖章；正文是冻结历史。`validate` 会校验被引用
的编号存在且自身未被取代，所以链条总是终止于当前仍被接受的决策。

## 直接记录已接受决策

```text
adrkit decide "使用 SQLite 存储会话"
# 填写草稿
adrkit validate 1
```

## Agent 工作流

Agent 可以通过 JSON 输出来驱动同样的生命周期：

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
