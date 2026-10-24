# 全仓审查 — 2026-10-24

> 本轮先审查后修复：五路并行深审（核心状态机、CLI 表面、可视化/HTML 栈、
> 双语文档与站点、测试/CI/发布）产出发现，逐条过 worth-fix 判定"属实"与
> "值得修"两个独立维度，然后修复值得修的条目并回填证据。
> 审查快照：`fcf511d`（v0.26.0），开始时工作区干净。

审查基线：`npm test` 全绿（31 文件、620 通过、1 跳过）。上一轮
（2026-10-21）的 11 项修复全部在位，无回归；HTML 转义首次逐插值点核验，
三个 HTML 产物与站点发布链路（`tools/build-decision-atlas.mjs` → GitHub
Pages）未发现可注入点：搜索与 reader 逐 token 走 `textContent`，记录 JSON
以 `\u003c` 挡住 `</script>`。本轮结论：无 P1，确认 P2 级 12 项。

## Worth-fix 判定与处置

| 发现 | 属实判定 | 值得修判定 | 处置 |
| --- | --- | --- | --- |
| `record`/`propose`/`note` 只取第一个词，多词标题以截断内容成功写入 | 坐实（实测两次误踩） | 高触发、数据截断、修复便宜 | 修：标题类命令拼接 shell 词；标识符类命令强制元数 |
| implement 删源失败不回滚，重跑静默复制同内容决策且 validate 全绿 | 坐实（chmod 555 实测） | 数据污染、retire 已有同型回滚 | 修：补回滚 + 可行动错误信息 |
| implement 就绪门跳过引用校验，四表面两个答案 | 坐实（实测放行后 validate 2 立即失败） | 移动门弱于校验门 | 修：输入与输出两处叠加 `validateRecordReferences` |
| 正文引用挖掘不识别围栏与注释，不可见 `ADR 999` 误报 | 坐实（实测围栏与注释均触发） | F2 教训的新路径复发 | 修：挖掘改走共享扫描器的可见行（validate 与 graph 同步） |
| supersede 链终点可经纯 CLI 落进 archived，validate 仍绿 | 现象坐实，**修复方向证伪** | 加 folder 检查会让合法 `archive` 立即制造无法修复的无效仓库——正是 2026-09-22 要消灭的缺陷类 | 不改行为：写明导航语义与引用语义之别（validate 注释），判定为设计内 |
| 站点模板内嵌五份共享脚本/样式为手工拷贝，无同步守护 | 坐实（字节级比对） | 发布链路唯一无守护的复制关系，镜像测试先例现成 | 修：新增 `test/atlas-template.test.ts` 字节级镜像 + i18n 键对账 |
| 空仓库 atlas 页加载即抛 TypeError；深嵌套 deliberation 三格式裸栈溢出 | 空仓坐实（代码路径核验） | 空仓守卫一行，深嵌套需引入深度上限政策 | 修空仓守卫；深嵌套不修（病态输入、需定政策，遗留） |
| atlas-i18n 死键 `展开`；EN 页运行时 aria-label 拼全角逗号 | 坐实（计数 0 / 机械扫描） | 一行级修复，键对账测试顺带防再发 | 修：删死键、加 `，`→`, `` 映射、键对账测试 |
| mermaid 两套转义器不一致、`<` 原样穿透 | 坐实 | `#lt;` 等实体需对 mermaid 渲染器实测才可换，strict 模式默认消毒 | 不修（需渲染器实测，风险大于收益，遗留） |
| SECURITY.md 版本表只有 0.1.x；zh/cli.md"始终输出完整档案"；AGENTS.md 同步指针指向 GetStarted.astro（文案实际在 ui.ts）；llms.txt atlas 链接指向中文页 | 全部坐实 | 文档即承诺，成本一行到一句 | 全修；zh 文档补"CLI 输出为英文"声明 |
| retire 回滚分支零测试（ADR 30 拆封印时连测试一起删了）；zsh/fish 真实 shell 测试在 CI 永远跳过 | 坐实（grep 无命中 / CI 日志 2 skipped） | 前者是"移动不半完成"承诺的唯一无门禁处；后者一个 apt 步骤闭环 | 修：补 retire 回滚测试；CI 装 zsh/fish；release 加 test |
| `--out ""` 裸 EISDIR；`no ADR matches` 无下一步；直跑 dist/cli.js 的 parseArgs 错误带栈 | 全部坐实 | 错误质量洼地，各一两行 | 全修 |

明确不修（含理由）：破折号同位语全仓清扫（纯风格，涉及 9 个 SKILL 与
模板镜像、standing-orders 生成戳协调，应独立成一个变更）；completion
枚举位置参数候选（feature 形态，需在 OptionSpec 加声明层）；CRLF 行尾
保留（`.gitattributes` 强制 `eol=lf`，CRLF 记录几乎不可达）；bin 的 Node
版本守卫（engines 已声明，ADR 28 姿态）；packlist 级包守护与 upstream
exit-2 测试（当前登记表正确、三态语义已文档化）；`?lang` 残留于地址栏
（纯观感）。

## 修复回填

- `src/cli.ts`：标题类命令（record/propose/note）拼接未加引号的 shell 词；
  标识符类命令（show/implement/reject/archive/supersede/completion/hook）
  拒绝多余位置参数；`validate` 拒绝 name 与 `--all` 组合；list/status/
  instructions/config/update 拒绝位置参数；parseArgs 挪进 try，dist 直跑
  不再倾倒栈。**破坏性变更**：原先被静默忽略的多余参数现在报错。
- `src/commands/implement.ts`：就绪门与晋升后置条件都叠加引用校验；删源
  失败回滚已写决策并指明重试路径。`src/commands/reject.ts`：同型回滚。
- `src/core/adr.ts`：新增 `visibleRecordText`（标题 + 掩蔽注释、排除围栏的
  可见散文）；章节标题取可见行；paths 文档注释与 validate 行为对齐。
  `src/core/validate.ts` 与 `src/core/graph.ts`：引用挖掘统一走该文本；
  archived 死子句删除；链终点语义写明"只看 status 是有意的"。
- `src/commands/atlas.ts`、`src/commands/graph.ts`：`--out` 空串与目录目标
  友好报错。`src/core/repository.ts`：`no … matches` 附 `adrkit list` 提示；
  removeRecord 注释不再引用已删除的回滚符号。
- 模板与 i18n：空画布 initialView 守卫；删死键 `展开`、加 `，` 映射。
- 文档：SECURITY.md、AGENTS.md 站点指针、llms.txt、README×2、docs/cli.md×2、
  docs/zh/workflow.md（因果句、首句歧义）。
- CI 与工具：ubuntu 测试 job 安装 zsh/fish；release 先 typecheck+test+build；
  `check-grilling-upstream.mjs` 的 diff 失败不再静默；`build-decision-atlas.mjs`
  归一化 SSH 形式的 repository URL（与 CLI 同规则并注明同步关系）。

先红后绿：新增边界测试在旧实现上 6 项失败（引用门、两条回滚、围栏/注释
挖掘、标题掩蔽）+ 2 项 parseArgs 契约测试失败；修复后全绿。retire 回滚
测试在旧实现上即通过（它锁定的是 ADR 30 已有行为，属补门禁）。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm test` | 32 个测试文件，653 通过、1 跳过（fish 本机缺失，CI 现已安装） |
| `npm run typecheck` / `npm run build` | 通过 |
| `node bin/adrkit.js validate --all` | 通过（自狗仓库含全部归档记录） |
| 自家决策地图（mermaid） | 可见行改动前后字节级一致，Graph.astro 无需刷新 |
| 模板镜像测试 | 五个共享常量逐字节在位；i18n 全部键仍在模板中 |
| 原始复现场景冒烟 | 多词标题、validate 冲突、implement 引用门、围栏引用、`--out` 守卫、matches 提示全部按新行为返回 |

过程事故与恢复：先红验证时新测试未 `chdir` 到临时仓库，旧代码在真实仓库
执行了 `archive` 与 `hook install`。已恢复：ADR 1 还原、误归档文件与
`a/` 目录删除、误装 hook 卸载；测试已加 `process.chdir` 并注释原因。
未验证：Windows 上的 zsh/fish 安装步骤、release 工作流实际运行、站点
构建（`cd site && npm run build` 未跑，改动未触及其输入面）。


## 复审回填：标题行开始的跨行注释

Worth-fix 判定：**坐实，P2，值得修**。触发概率偏低（需要把 HTML 注释
开在 H2 标题末尾），但影响内容校验、引用校验和 implement 的正文重写；
修复只需保留解析时被丢弃的标题尾部，不需要重构。遵循 ADR 16 的可见内容
规则和 ADR 18、25 的晋升语义，没有新增架构选择，因此不新增 ADR。

真实路径的四个回归场景在修复前全部失败：

- `## Decision <!--` 后仅有隐藏正文的记录错误地通过 validate。
- `## Proposal <!--` 后仅有隐藏正文的提案错误地通过 implement。
- 标题跨行注释中的 `ADR 999` 被误报为悬空引用；同类已存在引用会进入地图。
- 提案含可见正文时可正常晋升，但注释起始符丢失，隐藏文字变为可见正文。

根因：H2 名称取自 comment-masked 行，原始标题行被整体丢弃；章节正文
再独立扫描时已没有 `<!--`。修复在章节正文开头保留标题末尾的原始注释，
借用已有扫描器处理跨行状态，也让 implement 保留完整注释。完整同一行注释
仍可用于标题；普通标题的解析结果不变。archive、reject、supersede 只改
front matter，原始 Markdown 本来就保留，此处涉及的正文重写特指 implement。

回归测试固化在 `test/review-regressions.test.ts`，同时验证隐藏引用不入图、
可见引用仍入图、空提案拒绝后源文件不变，以及晋升前后注释可见性一致。

修复后验证：四个回归场景全部转绿；全量测试 657 通过、1 跳过；typecheck、
build、`adrkit validate --all` 与 `git diff --check` 均通过。


## CI 回填：真实 shell 测试的 Linux 运行条件

`c6f209d` 的 CI（run 40018644347）在两个 Ubuntu Node 版本均失败，
Windows、upstream、audit 和站点构建通过。失败是刚启用的两条 shell 测试：

- zsh 的 `compinit` 在发现不安全的 fpath 目录后等待人工确认，造成超时。
  Linux 容器捕获到实际提示 `Ignore insecure directories and continue`；
  改为 `compinit -i -D` 忽略这些目录后，九个补全结果全部符合预期。
  测试还显式加入权限为 0777 的目录，使本机也覆盖这个运行条件。
- fish 3.6 从 Node 的 Linux stdin 读取脚本，最小 `echo fish-ok` 即报
  `Unable to read input file: Is a directory`；相同脚本用 `-c` 执行则通过。
  测试改用 `-c`，原有补全断言全部保留。macOS 上 fish 4.x 也通过。

本机集成测试 55 项通过（zsh、fish 都实际执行），typecheck 和差异检查通过。
这是测试启动方式修复，不改变 ADR 36 规定的补全表面，不新增 ADR。
