# 记录格式

ADR Kit 用 YAML front matter 加 Markdown 正文，并按生命周期分目录：

| 目录 | 状态 | 文件名 | 含义 |
| --- | --- | --- | --- |
| `adr/proposed/` | `proposed` | `YYYY-MM-DD-slug.md` | 未交付提案 |
| `adr/implemented/` | `implemented` | `N-slug.md` | 已交付、仍指导当前工作 |
| `adr/rejected/` | `rejected` | `YYYY-MM-DD-slug.md` | 正式否决（反例库） |
| `adr/archived/` | `implemented` 或 `superseded` | `N-slug.md` | 冻结历史 |

front matter 的规范顺序是 `status`、`date`、`raised-by`、
`decided-by`、`created`、`commit`、`superseded-by`、`reason`、
`archived`、`archive-reason`、`tags`，只写适用字段。`date` 在每次生命周期
转移时由机器写入；`created` 保留出生日期；`archived` 是归档日期，
进入冻结历史时与 `date` 相同。
头部后必须空一行，再写 `# ADR: <标题>`；已编号决策为
`# ADR: N <标题>`。

四个目录也是一份上下文预算：`implemented/` 是现行权威、需完整阅读；
`proposed/` 是意图、需检查；`rejected/` 是反例、需检查；`archived/`
是最低价值的冻结历史、默认不读。

提案需要 `Problem`、`Proposal`、`Alternatives considered`、
`Acceptance criteria`、`Risks`。已实施和归档决策需要 `Problem`、
`Decision`、`Alternatives considered`、`Consequences`，不得保留提案期
章节。否决提案保留问题、方案和备选，并写入非空 `reason`，标明它挡住的
诱惑性错误；该记录是稳定终态，只有当另一条记录接管了这个错误时才移除。新模板未填实质内容时，`validate`
按预期失败；HTML 注释不算正文。

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

## 归档封存清单

`adr/archived/MANIFEST.json` 封存归档目录。它是带版本号的 JSON 文件
（`{"version": 1, "entries": [...]}`），每条归档记录一个条目，按归档顺序
追加：

```json
{ "path": "5-adopt-the-annotated-deliberation-grammar.md", "sha256": "<64 位十六进制>" }
```

`sha256` 是归档文件完整字节的哈希。`adrkit archive` 和 `adrkit supersede`
负责追加封存；同一路径永不二次封存，已有封存永不改写。`adrkit init` 会写入
该清单，且即使归档为空也必须存在，因此 `adrkit validate` 会把缺失的清单
报为错误。校验还会对缺失、格式错误、重复或多余的条目、缺失的归档文件、
以及与封存不符的归档字节报错——应恢复被封存的字节，而不是给改过的内容
重新封存。`adrkit validate --base <git-ref>` 从 Git 读取 base 的清单与归档
文件，要求 base 已封存的每个条目原样保留为当前清单的前缀，因此同时改写
归档文件与其哈希仍会失败；base 必须携带清单，清单缺失或无法读取时会失败，
而不是跳过历史校验。
