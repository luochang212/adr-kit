# CLI 参考

可在项目任意子目录运行；ADR Kit 向上寻找最近的 `adr/`。
记录位于 `proposed/`、`implemented/`、`rejected/`、`archived/`。

| 命令 | 作用 |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | 创建四个生命周期目录、配置、归档封存清单、README 和集成 |
| `adrkit propose <title>` | 创建按日期命名、未编号的未交付提案 |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | 交付后提升提案并分配稳定编号 |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | 直接记录已交付选择 |
| `adrkit reject <name> --reason <text>` | 把否决提案记为 `rejected/` 中的反例 |
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

## 配置类型错误

整仓校验会检查 `adr/config.yaml` 中的已知字段：`context` 和
`installed-with` 必须是字符串；`tools` 和 `workflows` 必须是字符串列表；
`rules` 必须把分组名称映射到字符串列表。已填写字段的类型错误（包括 `null`）
会导致校验失败。可选字段可以省略，未知键仍被接受。规则文本是提示，校验只
检查其类型，不检查记录是否遵循规则。

未加引号的冒号加空格可能使规则项被 YAML 解析为映射：

```yaml
rules:
  proposal:
    - Keep it short
    - max: 500
```

`adrkit validate --all` 会报出 `rules.proposal[1]`，索引从零开始。
将整个条目加引号，改为 `- "max: 500"`，即可成为字符串。
配置字段类型错误时，`list` 仍能列出记录；`status` 和 `instructions` 会
报告仓库校验问题，即使存在待办提案也一样。

## 封存后的源记录删除失败

`archive` 和 `supersede` 先写入归档文件及其封存清单，再删除 implemented
源记录。若源记录删除失败，命令会非零退出，说明封存已完成但源记录删除失败，
并报告两个文件路径及原始错误。两份副本都保留；操作既未完全完成，也未完全
回滚。对于 supersede，替代记录仍保持有效。

检查两份副本，并核对归档文件与封存清单是否一致。先把源记录中的独有内容
保存到封存归档之外，再修复权限，只删除确认冗余的 implemented 源记录。
不要修改归档文件或封存项。两份副本都存在时，按决策编号重试会产生歧义。
删除已确认的重复副本后，运行 `adrkit validate --all` 验证恢复结果。
