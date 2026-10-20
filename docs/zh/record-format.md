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
`archived`、`archive-reason`、`tags`、`paths`，只写适用字段。`date` 在每次生命周期
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
章节。晋升时，提案的 `## Acceptance criteria` 与 `## Risks` 会折叠为
`## Consequences` 下的 `### Verification` 与 `### Trade-offs`；implemented
记录不得在 Consequences 下直接保留旧的 `### Acceptance criteria` 或
`### Risks`。该检查忽略围栏代码与 HTML 注释，且只作用于 implemented 记录。
否决提案保留问题、方案和备选，并写入非空 `reason`，标明它挡住的
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
检查四个目录，拒绝编号重复、日期错误、目录与状态不匹配、四个目录之外的记录，以及悬空引用：记录正文可以用 `ADR-12`、`ADR 4` 或 `ADR12` 引用决策，指向不存在的编号会让整仓校验失败。

可选 `paths` 把记录限定到它管辖的文件——与 `tags` 是不同的轴：tags 按
主题分类，`paths` 回答「哪些决策管辖这个文件？」。条目为不重复的仓库相对
glob，使用正斜杠；`**` 跨目录分隔符，`*` 不跨目录，`?` 匹配单个字符，
其余字节按字面匹配（不支持大括号展开与字符类）；以 `*` 开头的条目在
YAML flow 写法中需要引号（`paths: ["**/*.ts"]`）。`adrkit relevant
<path>...` 按阅读姿态列出管辖给定文件或目录的记录；归档记录是冻结历史、
默认不检索，没有 `paths` 的记录永不匹配——范围检索不是全文搜索。该字段
在每次生命周期转移和提案晋升时保留。`adrkit validate` 拒绝空条目、重复
条目、绝对路径、含 `..` 的条目、反斜杠，以及静态前缀（第一个通配符之前的
字面部分）在仓库中不存在的条目——即重命名后范围悬空的漂移检查。归档记录
豁免漂移检查：封存字节不应因冻结之后文件树变化而开始失败。

代码可用 `@adr <编号>` 在注释中引用记录；指向不存在、已归档或已替代的
决策，或引用文件不在该记录的 `paths` 内时，`adrkit validate` 会失败。

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
