# 全仓审查与修复 — 2026-10-29

> 本轮先审查后修复：12 项发现逐条过 worth-fix（“属实”与“值得修”分开判定），
> 只用可复现的证据动手，复现先红、修复后转绿。审查基线 `857c851`（v0.30.0），
> 开始时工作区干净。本文记录提交前的复现、修复与验证；最终收尾见文末。

基线：`npm test` 35 文件 / 721 通过 / 1 跳过；`typecheck`、`build`、
`adrkit validate --all`、`check:upstream` 全部通过。

## Worth-fix 判定

| # | 发现 | 属实 | 值得修 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | 档案 payload 的 title 含编号，正文 H1 再拼一次 | 坐实（生成物 JSON） | 是（每次生成，可见重复） | 修 |
| 2 | config.yaml 缺失时全仓命令死锁 | 坐实（四命令实测） | 是（记录完好却无法使用） | 修（init 补全） |
| 3 | 换行标题写出不可解析记录且报成功 | 坐实（CLI 实测） | 是（盘点中断） | 修（入口拒绝 + 写前解析） |
| 4 | openspec/specs 主张已废的 seal 与已删命令 | 坐实（逐条对照 ADR 30/33/36） | 是（第二事实源） | 冻结（不删除） |
| 5 | 中文档案地图的生命周期文案仍为英文 | 坐实（生成物） | 是（双语产品面） | 修 |
| 6 | zsh 补全输出字面量 undefined | 坐实（三种选项） | 是（卫生级） | 修 |
| 7 | archive/supersede 两次取日期，跨午夜自相矛盾 | 坐实（注入时钟红测） | 是（一行，后悔不对称） | 修 |
| 8 | Deliberation 只认 `-`，`*` 列表静默无树 | 坐实（合法记录 + `*` 附录） | 是（常见写法） | 修解析与报错；不新增校验失败策略 |
| 9 | renderDecisionAtlas 默认语言 zh 与 CLI 默认 en 相反 | 坐实（代码） | 是（类型层强制，成本低） | 修（language 必填） |
| 10 | config 隐藏 `tools: []` 退出状态 | 坐实（代码） | 是（两行） | 修 |
| 11 | `paths: ["src/"]` 通过校验却永不匹配 | 坐实（CLI 实测） | 是（校验应拒绝死 scope） | 修（拒绝尾斜杠） |
| 12 | 研究文档仍写 adrkit graph | 坐实（grep） | 是（一行） | 修（历史标注） |

## 证据、根因与修复

### 1. 档案标题契约（ADR 33 的档案输出）

- 命题：真实解析的 `record.title` 含 `"N "` 前缀；payload 原样输出；`markdownBody`
  再拼 `record.number`；模板目录/阅读器直接显示 title。
- 复现：`adrkit atlas` 生成物得到 `"title":"1 alpha choice"` 与
  `"body":"\n# ADR: 1 1 alpha choice\n"`。模板样例与 25 处手写 fixture 的
  title 都不含编号，因此测试从未覆盖真实形状。
- 根因：解析器的 title 契约（含编号）与档案/模板的 title 契约（不含编号）不一致。
- 修复：payload 的 title 去掉 `/^\d+\s+/`；正文 H1 直接使用 `record.title`，
  不再二次拼接。回归测试改用 `parseAdrText` 的真实记录。
- 破坏性：仅输出层面的修正，无需迁移。

### 2. 缺失 config 的恢复路径

- 复现：`init` 后删除 `adr/config.yaml`，`validate/list/update` 报“no ADR Kit
  repository（先 init）”，`init` 又报“already exists”。`validateRepository` 的
  missing-config 分支从 CLI 不可达。
- 根因：`findRoot` 以 config 文件为唯一标记，而 `init` 以 `adr/` 目录为拒绝条件；
  两个判断没有共同的恢复出口。
- 修复：`findRoot` 仍只认 config（避免误认外来 `adr/`）；`requireRoot` 额外向上
  寻找 `adr/` 目录，报出缺失文件并指向 `init <root>`；`initRepository` 对
  “空 `adr/` 或含生命周期目录但缺 config”的树只补缺失的 config/目录/README，
  已有记录与手改文件不动；有 config 或含无关文件的 `adr/` 仍拒绝。
- 测试：`test/recovery.test.ts`（补全、保留用户文件、空目录、外来目录拒绝、
  错误信息）。
- 后续选项：若维护者希望彻底移除 config 标记，可另立记录；本轮不改该语义。

### 3. 标题换行

- 复现：`adrkit record $'bad\ntitle' …` 退出 0 并写出无法解析的文件；随后
  `adrkit list` 退出 1。
- 根因：标题被原样写入 `# ADR: ` 行；`record`/`propose` 不校验生成物，只有
  `implement` 会先解析。
- 修复：`assertSingleLineTitle` 在入口拒绝 `\r`/`\n`；两个创建命令在写盘前
  `parseAdrText` 生成内容，作为模板变化的兜底。
- 测试：`test/commands.test.ts` 的 record/propose 两例（非零退出、零写入、
  盘点仍可读）。

### 4. openspec 的归属

- 复现：`openspec/specs/archive-integrity` 要求 `MANIFEST.json` 与
  `validate --base`（ADR 30 已用 Git 历史取代）；`decision-graph` /
  `deliberation-tree` / `cli-option-surface` 仍写 `adrkit graph|tree` 与
  `--out`（ADR 33/36 已合并到 `atlas`）。AGENTS.md、CI、README 都不引用它，
  README 还写明 OpenSpec 不属治理模型。
- 判定：属实且值得处理；但“删除”会丢掉 ADR 19 等记录引用的推敲历史。
- 处置：冻结而非删除。新增 `openspec/README.md` 说明历史身份与三处具体冲突；
  11 份当前规格与 `openspec/config.yaml` 顶部加冻结标记；
  `openspec/changes/archive/` 原样保留。删除仍可作为后续独立决定。

### 5. 中文档案地图文案

- 复现：`--lang zh` 的地图节点写 `superseded by 8`，`aria-label="Decision map"`，
  而日期计数已是 `4 条`。
- 根因：SVG 在模板翻译之后生成，生命周期文案硬编码英文，只有 dateCount 接了回调。
- 修复：`DecisionMapSvgOptions.labels`（ariaLabel / archived / supersededBy）；
  独立地图默认英文，档案按语言传入 `被 ADR N 替代`、`已归档`、`决策地图`。
- 测试：`test/decision-atlas.test.ts` 的中英文断言；浏览器门禁 87 项通过。

### 6. zsh 补全

- 复现：`adrkit completion zsh` 出现 `--format=[undefined]` 等三处。
- 根因：`OPTION_DESCRIPTIONS` 缺 `--record/--format/--lang`，模板字符串吞掉 undefined。
- 修复：补齐三条描述，并对缺失项回退到选项名。
- 测试：`test/integrations.test.ts` 断言 zsh 输出不含 `undefined`。

### 7. 生命周期时间戳

- 传播链：`archive`/`supersede` 的 patch 各调用一次 `todayStamp()`；校验要求
  `archived === date`；跨午夜时刚归档的记录立即非法。`proposalTemplate` /
  `decisionTemplate` 的 `date`/`created` 是同类问题（`created` 可能晚于 `date`）。
- 复现：在 `test/lifecycle-stamp.test.ts` 用 `vi.hoisted` 注入“每次调用前进一天”的
  时钟，直接调用真实 archive/supersede；旧实现红（10-01 vs 10-02）。record/propose
  的同类双调用在修复后用同一时钟锁定（未单独回滚验证），二者共享“每个动作一次取戳”。
- 修复：每个动作只取一次 stamp。
- 测试：archive、supersede、record、propose 四例。

### 8. Deliberation 格式

- 复现：合法记录 + `## Deliberation` 里的 `*` 列表：`validate` OK，
  `atlas --record` 报“没有树”。
- 根因：`BULLET` 只认 `-`，且逐行扫描不复用 `markdownLines`；错误信息不区分
  “缺章节 / 空章节 / 有内容非列表”。
- 修复：接受 `-`、`*`、`+`；用 `markdownLines` 跳过围栏与注释并取可见文本；
  `treeCommand` 按三种情况分别报错。
- 明确不做：新增“有内容但无列表即校验失败”的规则。那会引入一种新的失败策略，
  可能误伤把附录当散文的作者；本轮修解析与可行动报错，等真实需求再定。
- 文档：`docs/record-format.md` / `docs/zh/record-format.md` 补语法、三种符号、
  围栏与注释规则。

### 9–12. 小项

- 9：`DecisionAtlasOptions.language` 改为必填，删掉 `?? 'zh'` 的静默默认；
  CLI 与站点脚本本来就显式传值。
- 10：`adrkit config` 对显式空列表打印 `tools: (none)`。
- 11：`paths` 拒绝尾斜杠，错误直接给出 `src/**`；升级指南说明这是本轮唯一的
  校验收紧（ADR 28 的告知义务）。
- 12：`docs/research/peer-adr-tools.md` 顶部加历史标注，说明 graph/tree 已并入 atlas。

## 温床复审（追加）

第一轮口头 review 列了四个“现在不是 bug、但容易长成 bug”的点；按 worth-fix
逐条复核后，一条被证伪，三条按不同方式处置。

| 温床 | 复核证据 | 判定 | 处置 |
| --- | --- | --- | --- |
| `atlas-i18n` 单字符全局替换 | 当前 EN chrome 残留 CJK = 0；注入 `人工 次数 无效` 实测变成 `Human工 refs数 None效` | 属实（潜在） | 加“EN chrome 无 CJK”守护测试；`人`/`次` 的键改成带引号的字面量；删除死键 `无` |
| folio density 用非贪婪正则抠 section | 当前 `overview-view` 内嵌 `<section` 计数 = 1（自身），无嵌套 | 当前不成立，未来耦合 | 只加不变量注释；不改提取逻辑（浏览器门禁覆盖布局） |
| `renderDecisionAtlas` 原地 `records.sort` | **证伪**：`options.records.filter(...)` 已返回新数组；实测调用方 `[2,1]` 前后不变 | 不是温床 | 不动；更正第一轮判断 |
| 25 个手写 fixture 的 title 不含编号 | 属实（F1 漏网原因）；唯一失配消费方是 atlas payload，已用真实解析记录锁定 | 部分属实（测试风险） | 不批量迁移；批量改会制造大量无意义期望变更 |

### 单字符键的处置

`translateAtlasMarkup` 对整份模板做全局替换，表里 `['人','Human']`、`['次','refs']`
是单字符键。模板里它们只出现在带引号的运行时字面量中，所以现在结果正确；但未来
任何含“人/次”的中文（如 `引用次数`）会被切碎。处置：

- 键改为 `["'人'", "'Human'"]`、`["'次'", "'refs'"]`——引号一起匹配，字面量仍正确，
  散文里的同字不再被改写；
- 删除死键 `['无','None']`：`无` 只出现在 `暂无记录` 内，长键先替换后它永不命中；
- 新增守护测试：翻译后（剔除 records 样例块）静态 chrome 不得残留 CJK。实测
  注入 `引用次数` 会让它报 4 个字符，而当前为 0。

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | 37 文件，742 通过、1 跳过 |
| `npm run typecheck` / `npm run build` | 通过 |
| `node bin/adrkit.js validate --all` | OK |
| `npm run check:upstream` | 固定哈希未漂移 |
| `npm run test:browser` | 87 项通过（含中英文档案、阅读器、主题门禁） |
| 编译后 CLI 冒烟 | 新行标题拒绝、星号树渲染、尾斜杠拒绝、config 退出可见、中文地图文案、config 修复、补全无 undefined 均符合预期 |

## 边界

- 未在 Windows/CI 实际运行；本地 macOS 上 `npm test`、构建、`validate --all` 与
  浏览器门禁通过。
- openspec 冻结是文档处置，没有新增门禁（本仓库没有 OpenSpec CLI 依赖）。
- 该批改动已提交为 `56fcf86`；提交后的补充复审见文末。

## 决策记录

本轮没有新增 ADR：全部是对既有契约的补齐或局部缺陷修复——档案输出对齐 ADR 33
的既有形状，config 修复不改变“config 标记仓库”的选择，`paths` 尾斜杠是 ADR 22
“scope 必须能命中”的自然收紧（并已在升级指南告知），OpenSpec 冻结是 ADR 18/30
既有立场的执行。若维护者认为 `init` 的“补全”语义或 Deliberation 的校验边界
需要成为长期契约，可另开记录。

## 未提交改动复审：两项发现的 worth-fix 核验

两项均直接调用生产函数复现，并保留为回归测试。均为局部补齐，
不需要重构，也不新增 ADR；遵循 ADR 7/10 的嵌套树与统一 renderability
契约、ADR 16 的扫描边界，以及 ADR 24 的集成文件/用户指令文件边界。

| 发现 | 真实性与实证 | 触发概率、影响、不修后果 | 成本与决定 |
| --- | --- | --- | --- |
| 修复仓库覆盖用户编辑的集成文件 | 坐实：真实 `initCommand` 初始化后修改技能、命令与 HTML 资源，删除 config 再 init；保留断言失败，内容变回模板 | 需 config 丢失且集成有本地编辑，频率有限；但每次恢复都会丢失编辑，并错误声称文件未动，不会自愈。中等/P2，属于内容丢失，无外部攻击者前提 | 低：恢复时在统一集成写入函数使用独占创建，只补缺失文件；值得修 |
| 嵌套围栏示例成为树节点 | 坐实（原有缺陷修复不完整）：四空格缩进围栏里的 `- Q: Example only [open]` 被 `parseDeliberation` 当成节点；代码中的未闭 HTML 注释还会隐藏后续真实节点 | 需要作者在嵌套选项下放代码示例；影响图和导出的真实性，源文件没有被修改。中等/P2；不修会在每次渲染继续混入示例或漏节点 | 低：共享扫描器支持 outline 消费方显式接受缩进围栏，通用记录解析默认规则保持原样；值得修 |

### 原理、修复与红绿证据

- 恢复流程复用了刷新逻辑：`writeToolIntegrations` 原来每次都写模板。
  现在仅在 repair 路径启用 `preserveExisting`，对命令、技能和附属资源
  使用 `wx`；遇到已有文件返回 `preserved`，其他文件系统错误仍抛出。
  `test/recovery.test.ts` 覆盖 `.agents/` 和 `.claude/` 的编辑保留、
  缺失技能补齐，以及随后显式 `updateCommand` 仍刷新已有文件。
- 围栏扫描原来只允许最多三空格缩进：适用于顶层标题扫描，却漏掉 outline
  中的四空格围栏。`parseDeliberation` 现在显式启用缩进围栏识别，继续复用
  同一扫描器处理注释与围栏中的字面量；默认记录解析模式没有改变。
  `test/deliberation.test.ts` 覆盖反引号、波浪号、围栏内未闭注释、
  围栏后的真实节点和真实仓库的 `treeCommand` 导出。
- 修复前运行 `npx vitest run test/recovery.test.ts test/deliberation.test.ts`：
  新增的保留断言与两种围栏断言均失败（3 个失败）。修复后，
  上述场景全部通过；再补的命令导出测试也通过。

### 本次验证边界

- 当轮 `npm test`：37 文件，746 通过、1 跳过；`npm run typecheck`、
  `npm run build`、`git diff --check`、编译后 CLI 的 `validate --all` 通过。
- 前轮复审的浏览器门禁为 87 通过。本次修改写入流程及服务端 outline
  扫描，未重新运行浏览器套件；没有修改模板或浏览器交互。
- 保留修复前全部工作区改动；随后提交为 `56fcf86`。

## 最终收尾与提交前自检

### 追加修复

最终 Spec 自检再次复现了缩进围栏的边界缺陷：未闭围栏会吞掉去缩进后的
兄弟选项/独立问题；代码内更深缩进的围栏会错误关闭代码块，使示例成为节点。
两个场景先写失败测试，再局部修复：outline 扫描跟踪列表内容缩进，
开闭围栏相对所属列表项仍只允许最多三空格缩进；离开列表容器时结束未闭围栏，
重新处理当前行。列表缩进栈只入栈/出栈，避免每行反复搜索整个祖先链。
常规 ADR 标题和内容扫描的默认规则保持原样。再次独立复核未发现新的具体回归。

初始化工作流原先笼统建议“已有 adr/ 就 update”，与缺 config 的恢复路径不符。
已同步 `skills/adrkit-init/SKILL.md` 和内置模板，并通过 CLI 更新本仓库生成的
`.agents/` 集成；AGENTS.md 仍由用户维护，生成标记不变。

### 知识面与边界

| 事实面 | 状态 | 证据/边界 |
| --- | --- | --- |
| 代码 | changed-and-verified | 回归测试及完整单元测试；Standards/Spec 分轴复审 |
| 本地运行态 | changed-and-verified | 编译后 CLI 校验、集成刷新及两主题双语浏览器门禁 |
| 文档 | changed-and-verified | 双语 CLI/格式/升级文档、changeset 与修复行为对齐 |
| 规则 | changed-and-verified | AGENTS.md 明确 OpenSpec 的历史身份；初始化技能与模板一致 |
| 记忆 | not-applicable | 未修改范围外或平台生成记忆 |
| 工作区 | verified-current | 仅本轮已知改动；单 worktree，无既有未推送提交；生成物保持忽略 |
| 发布 | out-of-scope | 本轮仅本地提交，不推送、不发 npm、不部署 |

没有本轮需要删除的临时文件、分支或 worktree；已有忽略缓存和历史目录保留。
未改动 archived ADR 与 OpenSpec change archives。此次为局部缺陷修复，没有新增
需要记录的架构选择。最终检查结果见下表；网络检查未验证不记为通过。

| 最终检查 | 结果 |
| --- | --- |
| `npm test` | 37 文件，748 通过、1 跳过 |
| `npm run typecheck` / `npm run build` | 通过 |
| `node bin/adrkit.js validate --all` | OK |
| `npm run test:browser` | 87 通过（包括 packed CLI 与集成资源） |
| `cd site && npm run build` | 通过 |
| `git diff --check` | 通过 |
| `npm run check:upstream` | pending：默认 Node fetch 请求失败；启用环境代理后固定内容请求可达，但 GitHub API 请求仍失败。未修改上游文件或 pin，不能宣称已核验上游是否漂移 |

单元测试中的 “checker … is gone” 输出来自专门验证丢失 checker 的 hook
失败场景，测试整体成功；浏览器的 `NO_COLOR`/`FORCE_COLOR` 提示仅涉及终端颜色。
本轮不改变运行环境的代理配置，也不以网络检查失败为由放宽上游门禁。

## 提交后补充：保留文件的版本戳

恢复保留旧集成时仍写入当前 `installed-with`，会错误声明这些文件的写入版本。
现在保留任一集成文件就不写版本戳，并在修复输出提示 `adrkit update`；
显式更新后才写入版本戳。`test/recovery.test.ts` 覆盖保留后的缺戳与更新后的写戳。
这项局部修复成本低、避免虚假状态，值得保留，无需新增 ADR 或重构。
缺戳时后续命令不会显示版本漂移提示；双语 CLI 文档、changeset 和代码注释
已据此修正，未引入持续提醒机制。此前围栏与文件保留修复的证据不重复追加。

补充提交前验证：Standards/Spec 复审通过；全量单元测试 748 通过、1 跳过，
类型检查、构建、ADR 校验与差异检查通过。本次无浏览器行为变化，未重跑浏览器门禁。
