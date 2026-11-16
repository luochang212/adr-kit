# 全仓审查与修复 — 2026-11-17

> 本轮先审查后修复：通读 `src/` 全部核心与命令代码及关键测试文档，9 项发现逐条
> 过 worth-fix（"属实"与"值得修"分开判定），只用可复现的证据动手，复现先红、
> 修复后转绿。审查基线 `700dec1`（开始时工作区干净；中途落地的 `050977b`
> 只改 `adr/` 记录与 AGENTS.md，`src/`、`test/`、`docs/` 与审查时逐字一致，
> 全部发现已对照其复核）。本文记录提交前的复现、修复与验证。

基线：`npm test`、`npm run typecheck`、`npm run build`、`node bin/adrkit.js
validate` 全部通过。

## Worth-fix 判定

| # | 发现 | 属实 | 值得修 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | pre-commit hook 的 staged 删除分支读工作区而非 index | 坐实（双向红测） | 是（同函数两种世界并存，且双向皆可误判） | 修 |
| 2 | validate 对 archived 记录的文件名/标题报错硬编码 implemented | 坐实（代码） | 是（两条插值，零风险） | 修 |
| 3 | 产品文案悬空引用 adr-kit 内部 ADR 20 | 坐实（INIT_README + delete 提示） | 是（用户仓库里编号无意义） | 修（范围扩大到 delete） |
| 4 | slug 字符类三处重复 | 坐实（adr.ts/validate.ts/slug.ts） | 是（写入侧有 CJK 测试、校验侧无人钉） | 修（单源化） |
| 5 | 记录路径上 5 处裸 `readFileSync` 绕过 ADR 16 的常规文件规则 | 坐实（代码） | 是（卫生级，一行一换） | 修 |
| 6 | hook 对 staged 到非标准位置的记录无 inventory 检查 | 坐实（代码推演） | 否（CLI 不会产生该布局，下一拍 validate 即报） | 不修 |
| 7 | instructions 对 config 问题短路、对其他问题不短路 | 坐实（代码） | 否（各自说得通的设计取舍，无可指出的受害场景） | 不修 |
| 8 | `parseWorkflows('')` 抛错而 `parseTools('')` 是 opt-out | 坐实（代码） | 否（仅手改配置触发，报错可操作，"空子集非法"是已写明立场） | 不修 |
| 9 | upgrading.md 的 "After 0.37.0" 段落先于发布存在 | 坐实（npm 上仍是 0.36.1） | 否（pending changeset 为 minor，发布时自动成真；作者刚维护过） | 不修 |

## 证据、根因与修复

### 1. hook 删除分支的世界不一致（含勘误）

- 命题：`hookCheck` 的 staged 删除分支经 `citationsTo`/`recordsReferencing`
  读**工作区**字节，而同一函数的 staged 引用循环（及已钉住的
  "reads the staged blob, not the working tree" 测试）以 **index** 为
  commit 的世界；函数自己的注释承诺"judge the post-commit state rather
  than the worktree"。
- 复现：两个红测试直击真实 `hookRunCommand`。
  其一：提交记录与引用 → `git rm` 记录 → 工作区修掉引用但不 stage →
  hook 放行（假阴性）。其二：修复已 stage、工作区回退 → hook 误拦
  （假阳性）。双向坐实。
- **勘误**：初判报告称"commit 后 validate 立刻变红"，验证后证伪——
  validate 读工作区，实际不会红。真实后果是提交内容带搁浅引用（违背
  hook 自身已钉住的 index 世界契约），加上误拦的困惑报错；定级由 P2
  修正为 P3，修复仍然成立。
- 根因：同一函数内两种字节源并存；删除分支沿用了 `adrkit delete`
  命令的工作区预检，而 hook 的世界是 index。
- 修复：`citationsTo` 增加可选字节源参数；hook 传入"index blob 优先、
  未跟踪文件回落工作区（validate 的 post-commit 扫描面）"的读取器，
  并把 index 解析出的 staged 记录同步进幸存者列表，使 prose 引用与
  引用扫描同读一个世界。archive/supersede/delete 命令不传参数，语义
  不变（它们的预检世界里工作区即世界）。
- 测试：`test/hook.test.ts` 两个场景固化，红→绿；26 项 hook 测试全过。

### 2. validate 报错对 archived 硬编码 implemented

- 复现：编号分支同时服务 implemented/ 与 archived/，两条消息写死
  "implemented file name must be…"、"implemented title must be…"；
  grep 全测试无该字符串钉住。
- 修复：照同分支 status 消息的既有做法插值 `record.folder`。

### 3. 内部 ADR 编号进入产品文案

- 复现：`INIT_README`（写入用户仓库的 adr/README.md 模板）与
  `adrkit delete` 的 durable 提示都带 `(ADR 20)`——在用户仓库里该编号
  指向不存在或无关的记录；本仓库自己的 adr/README.md 里它有意义。
- 根因：模板文本从本仓库 dogfood 副本拷贝时带上了内部出处。
- 修复：两处产品文案去掉编号、保留规则句；本仓库 adr/README.md 同步
  （`test/commands.test.ts` 的 dogfood 身份测试要求与生成物逐字节一致）；
  钉住 delete 提示的测试断言同步更新。本仓库的引用出处由 ADR 20 记录
  本身承担，文档副本不重复。

### 4. slug 字符类单源化

- 复现：`[a-z0-9一-鿿-]` 在 `adr.ts` 的编号文件名模式、`validate.ts`
  的提案文件名模式内联重复，`slug.ts` 以 `\u4e00-\u9fff` 写法第三次
  出现；测试只覆盖写入侧的 CJK 行为，校验侧无人钉——将来扩字符范围
  时三处必须人肉同步。
- 修复：`slug.ts` 导出 `SLUG_CHARACTERS`（类体），三处全部从它派生；
  行为零变化，`slug.test.ts`/`validate.test.ts`/`adr.test.ts` 原样通过。

### 5. 记录读取统一走常规文件规则

- 复现：`show.ts`、`implement.ts`（2 处）、`reject.ts`（2 处）在记录
  路径上直接 `readFileSync`，绕过 `readRegularText` 的 FIFO/设备防护；
  ADR 16 的规则与 `repository.ts` 的注释均要求"每个记录读取方"遵守。
- 修复：5 处换成 `readRecord`/`readRegularText`；各 catch 块的语义
  （"读不回的字节不是本次的字节"）不变，仅错误消息更规范。

## 判定不修的四项

- **hook inventory 盲区**（#6）：staged 到 `adr/implemented/nested/`、
  adr/ 根或未知目录的记录绕过 hook，但 CLI 自身永远不会产生这种布局，
  且下一次 validate 即报出可操作错误；修复需要复刻 root-document
  白名单，成本与触发概率不匹配。
- **instructions 短路不对称**（#7）：config 坏 → 先修仓库；其他问题 →
  列提案并附带 issues。各自成立，无受害用户故事；改行为是品味问题，
  只加注释则是 review 驱动的勤快修。
- **`workflows: []` 的不对称**（#8）：仅手改配置触发；报错本身可操作，
  "空子集不是有效的集成状态"是 tool-integrations 已写明的立场。
- **未发布版本号**（#9）：pending changeset 为 minor，`changeset version`
  时标题自动成真；近期提交显示作者在主动维护该段落。

## 收尾

| 事实面 | 状态 | 证据/边界 |
| --- | --- | --- |
| 代码 | changed-and-verified | 13 文件；39 文件 826 项单元测试通过、1 跳过；typecheck、build 通过 |
| 本地运行态 | verified-current | build 后 `node bin/adrkit.js validate` OK；本轮未触碰站点/模板代码，浏览器门禁未跑 |
| 文档 | changed-and-verified | 模板 README 与 dogfood 副本同步去编号；`docs/` 其余未动，本文为新增 |
| 规则与集成 | verified-current | tool-integrations.ts 未改动，integrations 导出无漂移（测试证明） |
| 记忆 | not-applicable | 未修改其他平台或生成记忆 |
| 工作区 | verified-current | 单 worktree、无 stash；origin/main..HEAD 的既有 8 个未推送提交为审查开始前已存在的维护者工作，本轮提交追加其上 |
| 发布 | out-of-scope | 只做本地提交，不推送、不发布、不部署 |

worth-fix 的两条过程纪律本轮生效："属实"与"值得修"分开判定后，四项
明确不修并留了理由；初判报告的一处影响断言（validate 会立刻变红）被
复现证伪并勘误如上。
