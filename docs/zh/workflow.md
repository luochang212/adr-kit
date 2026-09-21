# 工作流

## 何时值得记录

当架构选择会持续约束后续开发，且理由难以从代码直接看出时，才记录 ADR，
例如存储方案、模块边界、兼容策略或部署方式。只写实际作出的决定与真实取舍；
相同选择沿用已有记录，重要前提改变时记录替代决定。普通实现细节、局部修复
和可轻易调整的选择无需记录。没有重要架构决定的任务，不需要新建 ADR 或提交
决策汇报。这个门槛只约束直接路径；grill 会话本身就是"值得记录"的信号，
所以它会话中定下的每个决策都记录。`accepted` 表示正式记录的决定，不代表人已审阅批准；`raised-by` 与
`decided-by` 记录这条选择从哪来（谁把它提上台面，谁的判断定下了它），不是授权记录。

## 默认路径：直接记录决策

```text
adrkit init
adrkit decide "使用 SQLite 存储会话" --raised-by human --decided-by human
# 填写决策
adrkit validate
```

决策是 `adr/decisions/N-slug.md` 里的持久记录。直接记录是默认动作；审议发生在
命令之前，但一次会话的设计树可以留在记录的可选 `## Deliberation` 附录里。

## 记录之前先 grill

当重要选择仍在讨论、方向尚未定下时，`adrkit-grill` 工作流技能会围绕它反复
盘问你——以设计树的形式分轮推进——直到没有任何默认假设。grill 只会以
`adrkit decide` 收尾，绝不会落到提案：会话的根问题成为 `## Problem`，你否决的
选项成为 `## Alternatives considered`，定下的设计树留在下面的可选附录里。

## `## Deliberation` 附录

记录可以带一个可选的 `## Deliberation` 附录：决策背后的设计树，以嵌套
Markdown 列表保存。节点可用 `[settled]`、`[rejected]` 或 `[open]` 结尾；
条目之间的普通文字会被忽略，因此会话可以夹杂说明。用下面的命令渲染：

```text
adrkit tree <name>            # 嵌套文本大纲（默认）
adrkit tree <name> --mermaid  # Mermaid 图
adrkit tree <name> --html > "decision.html"  # 离线交互卡片树
adrkit graph --html > "map.html"      # 整套决策的离线地图
```

仅在用户要求可视化时生成 HTML，默认提供文件链接；明确要求时才打开浏览器。
技能调用内置渲染器，保证不同 AI 交付相同的布局与交互。

整套决策用 `adrkit graph --html` 渲染为离线决策地图，标出带树的决策，每个节点
链接到记录文件。

`<name>` 支持标题、文件名或决策编号。该附录只是那一条决策的参考资料，不是
每个任务都要读的内容。

## 提案：临时草稿

当一条决策还需要审议时，先建草稿：

```text
adrkit propose "使用 SQLite 存储会话"
# 填写草稿
adrkit accept "使用 SQLite 存储会话" --raised-by human --decided-by human
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
adrkit decide "使用 Postgres 存储会话" --raised-by human --decided-by human
# 填写新决策并校验
adrkit supersede 1 --by 2
```

旧记录留在 `adr/decisions/`，front matter 为 `status: superseded` 加
`superseded-by: 2`。只改写 front matter；正文是冻结历史。记录的 `raised-by`
与 `decided-by` 值都会被保留而不是替换：它们记录当初是谁把决策提上台面、
谁的判断定下了它——"谁"指选择的**来源**，不是谁执行的命令——而不是谁退役了它。
`validate` 会校验被引用的编号存在且自身未被取代，所以链条总是
终止于当前仍被接受的决策。

## 编码前查阅决策

ADR 通常只有十几条。开始或恢复编码、设计、审查任务时，运行 `adrkit list`，
用 `adrkit show <N>`（或直接读文件）读完现有决策，不仅凭标题筛选。
已接受记录提供决策背景；已替代记录是历史；待决草稿不代表已经批准。
结合当前代码和本次需求判断哪些约束仍适用。若前提变化或存在冲突，在选择
不同方案前说明原因，并在实现或审查总结中引用相关 ADR、验证受影响行为。
没有相关决定时正常继续；查阅不意味着每次任务都要新建 ADR。范围或相关文件
变化时重新读取，无需每编辑一行都重读。`## Deliberation` 附录记录决策背后的
设计树，是参考资料：只有该决策与当前任务相关时才读，不需要每个任务都读。

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

A `## Deliberation` appendix records the design tree behind a decision. It is
reference material: read it only when that decision is in play, not on every
task.

Record an ADR when an architectural choice will constrain future development
and its rationale is not apparent from code alone. Record only decisions
actually made and genuine alternatives and trade-offs; do not invent reasons
to fill a template. Reuse an existing record for the same choice; record a
replacement when important assumptions change. Routine implementation details,
local fixes, and easily reversible choices need no ADR. If no important
architectural decision was made, create none. When you grill a decision with
the `adrkit-grill` workflow, record every decision the session settles: the
session is itself the importance signal, so the bar above governs only the
direct `decide`/`propose` path. `accepted` means a recorded
decision, not proof of human review. `decided-by` is a declaration, not an
inference: `human` when a person determined the direction — they stated it,
changed a proposal into what shipped, or you are recording one they made
earlier — `agent` when it came from the agent's own judgment, including when a
person only let it through. The CLI neither infers nor verifies it, so say who
proposed and who approved in the body when that matters.
```

## Agent 工作流

记录本身就是接口：agent 直接读 `adr/decisions/*.md`——front matter 是 YAML，
正文就是决策。CLI 只提供单看某个文件读不出来的状态：

```bash
adrkit status        # 生命周期计数与仓库校验状态
adrkit instructions  # 下一步可执行动作，按待决草稿逐条标注
adrkit validate      # 格式闸门；任何问题都以非零退出
```
