# 记录格式

ADR Kit 用 YAML front matter 加 Markdown 正文，并按生命周期分目录：

| 目录 | 状态 | 文件名 | 含义 |
| --- | --- | --- | --- |
| `adr/proposed/` | `proposed` | `YYYY-MM-DD-slug.md` | 未交付提案 |
| `adr/implemented/` | `implemented` | `N-slug.md` | 已交付、仍指导当前工作 |
| `adr/rejected/` | `rejected` | `YYYY-MM-DD-slug.md` | 正式否决并留存 |
| `adr/archived/` | `implemented` 或 `superseded` | `N-slug.md` | 冻结历史 |

front matter 的规范顺序是 `status`、`date`、`raised-by`、
`decided-by`、`created`、`commit`、`superseded-by`、`reason`、
`archived`、`archive-reason`、`tags`，只写适用字段。`date` 在每次生命周期
转移时由机器写入；`created` 保留出生日期；`archived` 是归档日期，
进入冻结历史时与 `date` 相同。
头部后必须空一行，再写 `# ADR: <标题>`；已编号决策为
`# ADR: N <标题>`。

提案需要 `Problem`、`Proposal`、`Alternatives considered`、
`Acceptance criteria`、`Risks`。已实施和归档决策需要 `Problem`、
`Decision`、`Alternatives considered`、`Consequences`，不得保留提案期
章节。否决提案保留问题、方案和备选，并写入非空 `reason`。新模板未填实质
内容时，`validate` 按预期失败；HTML 注释不算正文。

编号决策必须写 `raised-by` 和 `decided-by`；未编号提案和否决记录禁止这
两个字段。取值为 `human` 或 `agent`，分别声明谁提出、谁的判断定下选择。
人仅放行 agent 的选择仍算 agent。CLI 只记录声明，不能推断或验证来源与交付。

完整替代时，`supersede` 写入 `status: superseded`、
`superseded-by: N` 及归档元数据，再将旧编号记录移至 `archived/`。替代链
必须无缺失、无环，终点是 implemented 决策。`archive` 为不再指导工作的
implemented 决策写 `archived` 和 `archive-reason`；原 `status` 保留
implemented，表示历史上的交付状态。编号始终稳定。可选 `tags` 必须为不重复
的小写 kebab-case；可选 `## Deliberation` 保留思辨树。`adrkit validate`
检查四个目录、编号重复、日期、目录与状态匹配、悬空引用等。
