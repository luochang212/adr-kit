# 工作流

## 默认路径：直接记录决策

```text
adrkit init
adrkit decide "使用 SQLite 存储会话"
# 填写决策
adrkit validate
```

决策是 `adr/decisions/N-slug.md` 里的持久记录。直接记录是默认动作；审议发生在
命令之前，不在文件里。

## 提案：临时草稿

当一条决策还需要审议时，先建草稿：

```text
adrkit propose "使用 SQLite 存储会话"
# 填写草稿
adrkit accept "使用 SQLite 存储会话"
```

`adrkit accept` 校验草稿并完成生命周期迁移所要求的改写：

- `## Proposal` 改为 `## Decision`
- `Acceptance criteria` 和 `Risks` 合并进 `## Consequences`
- 草稿提升为 `adr/decisions/N-slug.md`，原草稿被删除

没有变成决策的草稿会被丢弃：

```text
adrkit reject "使用 SQLite 存储会话" [--reason "我们最终选择了 JSON 文件"]
```

`reject` 删除草稿，不留下任何记录。拒绝记录在胜出决策的 `Alternatives
considered` 里，不是独立记录。

## 取代一条已接受决策

决策会被推翻。先记录替代决策，再退役过时记录：

```text
adrkit decide "使用 Postgres 存储会话"
# 填写新决策并校验
adrkit supersede 1 --by 2
```

旧记录留在 `adr/decisions/`，front matter 为 `status: superseded` 加
`superseded-by: 2`。只改写 front matter；正文是冻结历史。`validate` 会校验
被引用的编号存在且自身未被取代，所以链条总是终止于当前仍被接受的决策。

## Agent 工作流

Agent 可以通过 JSON 输出来驱动同样的生命周期：

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
