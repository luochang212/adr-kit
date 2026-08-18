# CLI 参考

在项目任意子目录运行；命令会向上查找最近的 `adr/` 目录。

## 全局选项

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 打印帮助 |
| `-V, --version` | 打印版本 |

面向 agent 的命令支持 `--json` 结构化输出。

## 命令

### `adrkit init [path] [--tools <list>]`

在 `path`（默认当前目录）创建 `adr/` 仓库。`--tools` 可选值：
`claude,codex,cursor,github-copilot,agents,all,none`。

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
section 之前会被 `validate` 判定为不通过。

### `adrkit decide <title>`

在 `adr/decisions/NNNN-slug.md` 创建已接受决策草稿。

### `adrkit accept <name>`

校验提案，分配下一个 `NNNN` 编号，改写生命周期 section，并把文件从
`adr/proposed/` 移动到 `adr/decisions/`。

### `adrkit reject <name> --reason <text>`

把提案移动到 `adr/rejected/`，拒绝原因写入状态行。

### `adrkit list [--json]`

按生命周期目录列出全部记录。

### `adrkit show <name>`

打印记录。`name` 支持标题、文件名、决策编号或 slug。

### `adrkit status [--json]`

打印生命周期计数与仓库校验状态。

### `adrkit instructions [--json]`

打印下一步该做什么。

### `adrkit validate [name] [--all] [--json]`

校验单条记录；省略 `name` 或使用 `--all` 时校验整个仓库。

### `adrkit update [--tools <list>]`

重写 AI 工具集成文件。未指定 `--tools` 时使用 `adr/config.yaml` 里记录的工具。

### `adrkit config [--json]`

打印当前配置。

### `adrkit completion <bash|zsh|fish>`

打印 shell 补全脚本。

### `adrkit version`

打印版本。
