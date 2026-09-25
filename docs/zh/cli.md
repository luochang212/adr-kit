# CLI 参考

可在项目任意子目录运行；ADR Kit 向上寻找最近的 `adr/`。
记录位于 `proposed/`、`implemented/`、`rejected/`、`archived/`。

| 命令 | 作用 |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | 创建四个生命周期目录、配置、归档封存清单、README 和集成 |
| `adrkit propose <title>` | 创建按日期命名、未编号的未交付提案 |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | 交付后提升提案并分配稳定编号 |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | 直接记录已交付选择 |
| `adrkit reject <name> --reason <text>` | 将否决提案及理由保留在 `rejected/` |
| `adrkit archive <name> --reason <text>` | 将不再指导工作的已交付记录归档 |
| `adrkit supersede <old> --by <new>` | 完整替代并归档旧决策 |
| `adrkit list` | 按生命周期列出记录 |
| `adrkit show <name>` | 按标题、文件名、slug 或编号显示记录 |
| `adrkit status` | 显示各目录数量与校验状态 |
| `adrkit instructions` | 显示待办提案与下一步 |
| `adrkit validate [name] [--all] [--base <git-ref>]` | 校验单条记录、整个仓库，或归档的只增不改历史 |
| `adrkit update [--tools <list>] [--workflows <list>]` | 刷新 agent 集成 |
| `adrkit config` | 显示配置 |
| `adrkit graph [--mermaid\|--dot\|--text\|--html] [--formal-only] [--tag <tag>] [--out <path>]` | 可视化编号决策及历史 |
| `adrkit tree <name> [--mermaid\|--text\|--html]` | 渲染思辨树 |
| `adrkit completion <bash\|zsh\|fish>` | 输出 shell 补全 |
| `adrkit version` | 输出版本 |
| `adrkit help` | 输出帮助 |

`-h, --help` 打印帮助；`-V, --version` 打印版本。不支持的选项会报错。
`--raised-by` 声明谁提出已交付选择，`--decided-by` 声明谁的判断定下它；
二者都不是 CLI 推断。`reject` 与 `archive` 必须提供 `--reason`。
CLI 不能验证代码已交付或现状另有权威来源。`--tools claude` 在默认
`.agents/` 之外增加 `.claude/` 副本；`--tools none` 不安装集成。
`validate --base` 只支持整仓校验——与单条记录查询同用会被拒绝；base 引用
或其清单缺失、无法读取时会报出可操作的错误。
