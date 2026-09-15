# 工作流

## 何时值得记录

当架构选择会持续约束后续开发，且理由难以从代码直接看出时，才记录 ADR，
例如存储方案、模块边界、兼容策略或部署方式。只写实际作出的决定与真实取舍；
相同选择沿用已有记录，重要前提改变时记录替代决定。普通实现细节、局部修复
和可轻易调整的选择无需记录。没有重要架构决定的任务，不需要新建 ADR 或提交
决策汇报。`accepted` 表示正式记录的决定，不代表人已审阅批准；`decided-by`
只是执行环境推断，不能证明是谁自主拍板或授权。

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
值会被保留而不是重盖：它描述记录决策时推断的执行环境，而不是退役动作的
执行环境。`validate` 会校验被引用的编号存在且自身未被取代，所以链条总是
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

Record an ADR when an architectural choice will constrain future development
and its rationale is not apparent from code alone. Record only decisions
actually made and genuine alternatives and trade-offs; do not invent reasons
to fill a template. Reuse an existing record for the same choice; record a
replacement when important assumptions change. Routine implementation details,
local fixes, and easily reversible choices need no ADR. If no important
architectural decision was made, create none. `accepted` means a recorded
decision, not proof of human review. `decided-by` infers the execution
environment, not who independently chose or authorized the decision.
```

## Agent 工作流

Agent 可以通过 JSON 输出来驱动同样的生命周期：

```bash
adrkit status --json
adrkit instructions --json
adrkit validate --json
```
