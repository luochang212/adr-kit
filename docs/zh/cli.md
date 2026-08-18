# CLI 参考

在项目任意子目录运行；命令会向上查找最近的 `adr/` 目录。

## 全局选项

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 打印帮助（`adrkit help` 等效） |
| `-V, --version` | 打印版本 |

面向 agent 的命令（`list`、`status`、`instructions`、`validate`、`config`）
支持 `--json` 结构化输出；其他命令会拒绝该 flag 而不是静默忽略。

## 命令

### `adrkit init [path] [--tools <list>]`

在 `path`（默认当前目录）创建 `adr/` 仓库。`--tools` 可选值：
`claude,codex,cursor,github-copilot,agents,all,none`，用于同时写入
AI agent 命令文件和 skills。

```text
adr/
├── config.yaml
├── README.md
├── decisions/
├── proposed/
└── rejected/
```

### `adrkit propose <title>`

在 `adr/proposed/YYYY-MM-DD-slug.md` 创建提案。草稿在填写完所有必填
section 之前会被 `validate` 判定为不通过。标题不得以数字开头；编号由
ADR Kit 分配。

### `adrkit decide <title>`

在 `adr/decisions/N-slug.md` 创建已接受决策草稿。标题不得以数字开头。

### `adrkit accept <name>`

校验提案，分配下一个 `N` 编号，改写生命周期 section，并把文件从
`adr/proposed/` 移动到 `adr/decisions/`。提案标题不得以数字开头。

### `adrkit reject <name> --reason <text>`

把提案移动到 `adr/rejected/`，拒绝原因写入状态行。

### `adrkit list [--json]`

按生命周期目录列出全部记录。

### `adrkit show <name>`

打印记录。`name` 支持标题、文件名、决策编号或 slug。仓库中其他无法
解析的记录不会阻塞 `show`；`adrkit validate` 仍会报告它们。

### `adrkit status [--json]`

打印生命周期计数与仓库校验状态。

### `adrkit instructions [--json]`

打印下一步工作流步骤（init、fix validation、decide 或 propose）。有待决
提案时，每条提案会标注为已验证（可直接接受）或需要修改，因此下一步是
可执行动作而非方向。`--json` 模式下就绪状态通过 `readyToAccept` 和
`needsWork` 字段暴露在 `pending` 列表旁边。

### `adrkit validate [name] [--all] [--json]`

校验单条记录；省略 `name` 或使用 `--all` 时校验整个仓库。单条记录校验
同样会检查 `superseded by N` 引用是否指向一个存在且未被 superseded 的
决策。

### `adrkit update [--tools <list>]`

重写 AI 工具集成文件（slash-command 文件与 skills，例如
`.claude/skills/`、`.codex/skills/`）。未指定 `--tools` 时使用
`adr/config.yaml` 里记录的工具。

### `adrkit config [--json]`

打印当前配置。

### `adrkit completion <bash|zsh|fish>`

打印 shell 补全脚本。

### `adrkit version`

打印版本。
