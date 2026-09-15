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
`superseded-by: 2`。只改写 front matter；正文是冻结历史。记录的 `decided-by`
值会被保留而不是重盖：这个字段回答的是谁做的决策，而不是退役动作由哪个
环境执行。`validate` 会校验被引用的编号存在且自身未被取代，所以链条总是
终止于当前仍被接受的决策。

## 编码前查阅决策

ADR 通常只有十几条。开始或恢复编码、设计、审查任务时，运行 `adrkit list`，
用 `adrkit show <N>`（或直接读文件）读完现有决策，不仅凭标题筛选。
已接受记录提供决策背景；已替代记录是历史；待决草稿不代表已经批准。
结合当前代码和本次需求判断哪些约束仍适用。若前提变化或存在冲突，在选择
不同方案前说明原因，并在实现或审查总结中引用相关 ADR、验证受影响行为。
没有相关决定时正常继续；查阅不意味着每次任务都要新建 ADR。范围或相关文件
变化时重新读取，无需每编辑一行都重读。

把下面的规则加入项目的 `AGENTS.md`；团队以 `CLAUDE.md` 为入口时也放在那里。
保留已有指令，已有同类规则时合并，避免重复。初始化技能会引导 agent 完成此步骤；
CLI 的 `init` / `update` 只安装工作流文件，不修改这些项目指令。
已有项目运行 `adrkit update` 更新技能后，也需要补入此规则。

```markdown
## Reading architecture decisions

At the start of a coding, design, or review task, if `adr/` exists, run
`adrkit list` and read every decision in full with `adrkit show <N>` (or read
its file). ADR sets are small; do not filter by title alone. Treat accepted
records as decision context, superseded records as history, and pending
drafts as unaccepted proposals. Check relevant decisions against current
code and the task's requirements. Apply the constraints that still hold;
explain conflicts or changed assumptions before choosing a different approach.
Mention relevant ADR numbers in the implementation or review summary and
verify the affected behavior. If no decisions apply, continue normally;
reading does not require creating an ADR. Re-read on a new or resumed task,
or when scope or relevant files change, rather than relying on conversation
memory.
```

## Agent 工作流

Agent 可以通过 JSON 输出来驱动同样的生命周期：

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
