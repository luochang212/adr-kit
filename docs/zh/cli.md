# CLI 参考

可在项目任意子目录运行；ADR Kit 向上寻找最近的 `adr/`。
记录位于 `proposed/`、`implemented/`、`rejected/`、`archived/`。

| 命令 | 作用 |
| --- | --- |
| `adrkit init [path] [--tools <list>] [--workflows <list>]` | 创建四个生命周期目录、配置、README 和集成 |
| `adrkit propose <title>` | 创建按日期命名、未编号的未交付提案 |
| `adrkit note <text>` | 把带时间戳的一行决策便笺追加到 `adr/notes.md`；在生命周期之外，校验忽略它，`list` 与 `instructions` 计数显示 |
| `adrkit implement <name> --raised-by <human\|agent> --decided-by <human\|agent>` | 交付后提升提案并分配稳定编号 |
| `adrkit record <title> --raised-by <human\|agent> --decided-by <human\|agent>` | 直接记录已交付选择 |
| `adrkit reject <name> --reason <text>` | 把否决提案记为 `rejected/` 中的反例 |
| `adrkit archive <name> --reason <text>` | 将不再指导工作的已交付记录归档 |
| `adrkit supersede <old> --by <new>` | 完整替代并归档旧决策 |
| `adrkit list` | 按生命周期列出记录 |
| `adrkit relevant [<path>... | --base <git-ref> | --staged]` | 按阅读姿态检索手工路径、指定提交到工作区的变化或暂存区文件；三种输入互斥 |
| `adrkit show <name>` | 按标题、文件名、slug 或编号显示记录 |
| `adrkit status` | 显示各目录数量与校验状态 |
| `adrkit instructions` | 显示待办提案与下一步 |
| `adrkit validate [name] [--all]` | 校验单条记录或整个仓库（含闭合的生命周期清单） |
| `adrkit update [--tools <list>] [--workflows <list>]` | 刷新 agent 集成 |
| `adrkit config` | 显示配置 |
| `adrkit hook <install\|uninstall\|run>` | 安装、移除或运行托管的 pre-commit 检查：暂存记录或引用有错则失败，否则列出管辖这些改动的生效决策 |
| `adrkit atlas [--out <path>] [--map] [--lang <en\|zh>] [--record <name>] [--format <mermaid\|dot\|text\|html>] [--tag <tag>] [--formal-only]` | 写出决策档案；无参数是完整档案（界面默认英文，`--lang zh` 为中文），`--record` 是单条决策的 deliberation tree（卡片视图），`--map` 显式选择决策地图；`--format` 只设置已选对象的格式，完整档案只支持 HTML |
| `adrkit completion <bash\|zsh\|fish>` | 输出 shell 补全 |
| `adrkit version` | 输出版本 |
| `adrkit help` | 输出帮助 |

地图必须显式指定：`adrkit atlas --map --out map.html` 默认输出 HTML 地图，
可加 `--format mermaid|dot|text|html`。不带 `--map` 的
`adrkit atlas --format html --out adr.html` 输出完整决策档案。
`--tag`、`--formal-only` 要求 `--map`；`--map` 与 `--record` 互斥。
`--lang` 仅用于完整档案，也允许配合显式 `--format html`。

这是破坏性变更：旧地图导出命令须增加 `--map`。未显式指定地图或单条记录时，
非 HTML 格式会报错并指出修正方式；HTML 格式始终输出完整档案。

三种对象都默认输出 HTML。`atlas --record <name>` 与
`atlas --record <name> --format html` 输出相同的 deliberation tree，
`--format mermaid|text` 导出树的源码。旧 `--diagram` 参数已移除。
不接受位置参数；选择记录请用 `--record <name>`。
使用 `--out` 时，回执说明对象、格式和绝对路径，例如
`wrote deliberation tree (html) to /path/tree.html`；不带 `--out` 时，
标准输出只含产物本身。

`-h, --help` 打印帮助；`-V, --version` 打印版本。不支持的选项会报错。
`--raised-by` 声明谁提出已交付选择，`--decided-by` 声明谁的判断定下它；
二者都不是 CLI 推断。`reject` 与 `archive` 必须提供 `--reason`。
CLI 不能验证代码已交付或现状另有权威来源。`--tools claude` 在默认
`.agents/` 之外增加 `.claude/` 副本；`--tools none` 不安装集成。

整仓校验还会检查代码与配置文件中的 `@adr <编号>` 引用：引用必须指向一条
已交付、且 `paths` 覆盖该文件的决策；指向不存在、已归档或已替代的决策会失败，
并报出行号（已替代时还会报出替代者）。Markdown 与根目录 `site/` 的文档副本不扫描，
引用是可选的——只检查已经写下的那些。

## 校验覆盖面

`adrkit validate <名称>` 校验单条记录；`--all` 追加下述整仓检查。新记录在
必填小节填完之前按预期失败。

每条记录、所有模式都检查，归档记录也一样。

- Front matter：可解析的规范布局，无未知字段；`created` 必填、为真实
  日历日期、不晚于状态日期；`commit`（存在时）必须是 git hash。
- `tags`（存在时）：非空、小写 kebab-case、不重复。
- `paths`（存在时）：非空、仓库相对、正斜杠、不含 `..`、不重复，且每个
  静态目录锚点（无通配符时为完整路径）在仓库中仍然存在。
- 小节：按状态要求的必备标题齐全、不重复。`Problem`、`Decision`/`Proposal`
  和 `Alternatives considered` 必须有实际内容；`Consequences`、
  `Acceptance criteria`、`Risks` 必须有标题，但正文可以为空。
- 目录一致性：implemented 记录为 `N-slug.md`、标题 `# ADR: N <标题>`、
  编号一致、声明 `raised-by` 与 `decided-by`、不含提案期小节；提案为
  `YYYY-MM-DD-slug.md`、无编号、无来源字段；`superseded` 指向另一条决策；
  归档元数据只出现在 `archived/`。
- 正文引用（`ADR-12`、`ADR 4`、`ADR12`）指向存在的决策；对提案尚未
  取得编号的前向引用也会失败。
- implemented 记录的 `### Later changes` 条目以 `**Amended by ADR N:**`
  开头；以 `ADR N later` 开头的尾注段落、丢失开头的条目，或首条合法条目之前
  的普通正文会失败，承接上一条的普通段落不受影响。
- 替代链无环且最终指向 implemented 决策；后继无需反向引用。
整仓（`--all`）额外检查：

- 四个生命周期目录就是全部清单：未知目录、`adr/` 根下的记录、嵌套目录
  都会失败；`adr/config.yaml` 存在且已知字段类型正确。
- 编号在 `implemented/` 与 `archived/` 之间全局唯一。
- 代码与配置中的 `@adr <编号>` 引用（细节见上）；源文件或目录不可读时
  报告扫描诊断并使校验失败。
- 归档记录与其他记录一样满足格式、路径和引用校验。

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

## 归档后的源记录删除失败

`archive` 和 `supersede` 先写入归档文件，再删除 implemented 源记录。
若源记录删除失败，命令会撤回暂存的归档副本、非零退出，并报告两个路径及
原始错误。implemented 源记录保留，移动不会半完成。修复文件系统错误后重试；
supersede 的替代记录仍保持有效。

## 按变更检索决策

```sh
adrkit relevant src/payments/api.ts       # 计划路径，不要求 Git
adrkit relevant --base HEAD               # 指定提交 → 工作区，含未跟踪文件
adrkit relevant --staged                  # 仅暂存区，首次提交前也可使用
```

三种输入互斥，不能组合开关或同时传手工路径。`--base` 直接比较指定提交，
不自动取 merge-base；审查时明确选定比较基线。它包括暂存、未暂存和未忽略的
未跟踪文件。`--staged` 排除仅未暂存或仅未跟踪的变化。两者包含删除路径及
重命名的新旧路径，转换为最近 ADR 根目录的相对路径，不把 Git 文件输入扩展成
目录扫描。空 diff 表示没有变更路径，不表示没有约束；Git 或引用错误会以非零退出。

手工目录输入每个最多扫描 2,000 个文件，跳过 `.git` 和 `node_modules`。
截断或文件系统读取失败时仍输出已取得的匹配与具体诊断，并以 **1** 退出；
缩小路径或解决错误后再依赖结果。尚不存在的手工路径仍可用于计划文件。
现行记录解析或读取失败会终止检索；不读取归档记录。即使有命中，输出也会提示
没有 `paths:` 的现行记录数量；这是覆盖限制，不导致失败，需通过 `adrkit list`
判断其相关性。成功检索只是一份范围候选清单，不证明代码合规或全部约束已被找到；
相关记录仍需完整阅读。

## 并发写入决策

编号记录写入前会独占创建 `adr/.write-N.lock`，再检查 `implemented/` 与
`archived/` 并写入。竞争失败的写入者会报错，可重跑以分配下一个可用编号。
新 implemented 记录不会覆盖已有文件；归档暂存保留同名文件的写入行为。
成功或捕获到错误时都会释放锁。进程被强制终止后，需先确认该编号没有写入者
运行，再删除残留锁文件并重跑。这保护编号写入；生命周期命令仍应逐个运行。
