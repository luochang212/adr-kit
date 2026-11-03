# 工作流

## 何时记录

记录门槛写在已安装的工作流技能里：`adrkit-propose`、`adrkit-record`、
`adrkit-grill` 携带决定一个选择是否值得成为 ADR 的四问。agent 读的是技能；
本页不再重复。

Grilling 使用同一标准，讨论过不代表必须记录。存在值得记录的结果时，完整
会话树保存在该记录的 Deliberation 附录，局部答案作为背景，不成为独立维护义务。
没有值得记录的结果时，在会话中总结，不创建记录。讨论定向不等于实际交付。

可用[记录判断场景集](../recording-evaluation.md)验收 agent 行为。它是人工评估协议；
模板测试通过不代表模型质量已获验证。

## 生命周期

每个阶段由已安装的技能负责：`adrkit-propose` 在 `proposed/` 创建未编号提案，
`adrkit-implement` 把已交付提案提升为 `implemented/`，`adrkit-record` 记录未经
提案的已交付选择，`adrkit-reject` 在 `rejected/` 保留稳定反例，
`adrkit-supersede` 或 `adrkit-archive` 把退役指导移入 `archived/`，
`adrkit-validate` 检查四个目录。参数、拒绝规则和退役语义都在这些技能与 CLI
参考里；本页不再重复。

`adrkit-visualize` 负责浏览，包括可选的示例档案。

## 让记录与已交付代码保持一致

流程分散在已安装的技能里：`adrkit-propose` 创建前检索重叠，
`adrkit-implement` 把记录声称的事实与已交付代码和测试核对，`adrkit-review`
将变更记录与变更代码对照，找出过时的实现事实和未解析的替代关系。详见这些技能。

## 任务开始前阅读决策

`adrkit-propose`、`adrkit-record`、`adrkit-review` 承载阅读姿态：四个目录是
一份上下文预算，`adrkit list` / `adrkit relevant` / `adrkit show` 的用法，以及
任务或范围变化后重新阅读。可选的 `AGENTS.md` 段落只告知命令，不规定何时运行；
CLI 不会改写它。


## 用证据共同设计

`adrkit-grill` 负责提问与证据纪律；`adrkit-propose`、`adrkit-record`、
`adrkit-review` 要求有依据的观察，不能为了填模板编造理由。`adrkit-note`
负责带可选来源的一行捕获。审查时，`adrkit-review` 用
`adrkit relevant --base <review-base>` 或 `adrkit relevant --staged` 根据实际
修改重新检索。详见这些技能。
