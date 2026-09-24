# 工作流

## 何时记录

记录会约束未来开发、且理由不能从代码直接看出的架构选择。备选与取舍必须
真实；普通修复无需 ADR。grilling 会话本身就是重要性信号，因此应记录它定下
的每个选择。但讨论定向不等于实际交付。

## 生命周期

1. `adrkit propose "<标题>"` 在 `proposed/` 创建未编号提案，可编辑并提交
   Git 供审阅。方向已定但尚未交付仍留在这里。
2. 交付后运行 `adrkit implement <name> --raised-by <human|agent>
   --decided-by <human|agent>`，校验并移入编号的 `implemented/`。未经过
   提案但已交付的选择，用相同来源声明运行 `adrkit record <title>`。
3. `adrkit reject <name> --reason "<理由>"` 将正式否决提案保留在
   `rejected/`，不分配 ADR 编号。
4. 完整替代用 `adrkit supersede <old> --by <new>`：旧编号记录带
   `superseded-by` 进入 `archived/`。部分替代仍保留有效的现行指导。
   其他低未来价值记录，仅当现状另有权威来源时，才用 `adrkit archive <N>
   --reason "<现状来源>"` 归档；绝不按年龄归档。
5. `adrkit validate` 检查四个目录。新模板必填章节未填时会失败。
   `adrkit graph --html` 绘制编号决策及历史，`adrkit tree <name> --html`
   绘制可选 `## Deliberation` 思辨树。

## 任务开始前阅读决策

任务开始先运行 `adrkit list` 发现目录清单。完整阅读相关 implemented 记录，
检查相关 proposed、rejected 记录，archived 仅供历史参考。不能只看标题
判断相关性，还应看标签、路径、关系和任务范围。将记录与当前代码核对，
解释假设变化，在总结中提及相关 ADR 编号。任务范围变化后重新阅读。
Agent 技能指导生命周期操作，但 CLI 不会自动编辑 `AGENTS.md` 或
`CLAUDE.md`。
