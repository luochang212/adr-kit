# Coding Agent ADR 工具：竞品机制与 ADR Kit 的可借鉴方向

> 研究时间：2026-10-14 | 所属领域：架构决策记录与 Coding Agent 工作流 | 研究对象类型：开源开发工具

本报告回应的问题是：分享中推荐的工具究竟做了什么，哪些机制能让本仓库更好，而不是把竞争对手的功能清单变成我们的待办。**当前最值得研究的是把已有路径检索接到真实变更、让截断与覆盖不足可见、让捕获材料有证据。** 直接复制自动生成 Accepted ADR、默认安装 hooks、执行任意 TypeScript 规则，都有比界面上看到的功能更大的代价。

这是研究结论与候选清单，不是采纳决定。研究型 OpenSpec 为 `research-agent-adr-competitors`，`skip_specs: true`。不修改 CLI、记录格式、依赖、生命周期或现有 ADR。全文中的“建议”均需独立验证，涉及持续架构约束的采纳另走决策流程。

## 1. 范围、证据与名字消歧

### 1.1 分享内容提供了什么线索

起点是用户提供的[分享会话](https://chatgpt.com/share/6acf3b56-e0ec-83e9-9f7c-8212809af3e3)。网页正文提取没有返回会话，但 HTML 内嵌序列化文本可读；本次实际读取了推荐理由与链接。它重点列出 adr-gen、arch-decision、mbeacom/adrkit、Archgate 和 mcp-adr，并把价值拆成事后捕获、方案形成、长期检索、约束执行与管理接口。这个拆分适合作为研究问题，推荐次序不适合作为效果排名。

分享自己的限制也很清楚：没有做同仓库、同模型对比。我们延续这个边界，并补上源码核验。一个产品写了“MCP”或“AI native”，不能据此推导它生成的理由真实、能找到所有适用决定，或者能证明代码合规。生成、检索、检查是三件不同的事。

名字必须写全。本仓库是 [luochang212/adr-kit](https://github.com/luochang212/adr-kit)，npm 包 `adr-kit`，命令 `adrkit`。分享重点推荐的是 [mbeacom/adrkit](https://github.com/mbeacom/adrkit)，另一个项目，字段和生命周期都不同。旧研究的 rvdbreemen/adr-kit 与 kschlt/adr-kit 又是两款 Python 工具。报告后文说“我们”仅指 luochang212/adr-kit。

### 1.2 取证等级与复现边界

- **文档宣称**：官方 README 或技能说明写了什么，未自动等同于已实现。
- **代码观察**：固定 commit 的入口、核心实现或测试支持什么。阅读测试不等于运行测试。
- **实际运行**：在隔离临时目录跑过的命令与探针，明确输入和结果。
- **研究判断**：基于上述事实对收益、成本和风险的解释，不当作作者动机或客观性能排名。

主要竞品都核对官方来源和源码快照。对 adr-gen 额外运行了测试与无模型探针；未对五款竞品做统一真实模型实验，未连接用户真实会话，未安装竞品到工作仓库。Stars、维护活动和版本只作为快照背景，不能换算用户满意度或质量。没有公开证据的作者背景、用户规模、商业价格或效果暂缺，不补造。

我们基线为 `f76872965115e628888394f78d6e649ca725477c`，package version 0.17.0。查阅 `README.md`、`src/core/relevant.ts`、`src/core/glob.ts`、`src/core/validate.ts`、`src/commands/relevant.ts`、`skills/adrkit-grill/SKILL.md` 与 CI。相关 ADR 18、19、20、21、22 已全文阅读；没有读取或改动封存 ADR 文件。

### 1.3 为什么不沿用 9 月结论

[2026-09-21 的研究](peer-adr-tools.md)有价值，但其中“没有机器可读代码链接”“没有检索”“decide 是默认入口”等是当时观察。如今 ADR 18 明确区分未交付与已交付；ADR 21 提供一行 note 缓冲；ADR 22 已提供 paths 检索和静态前缀漂移检查。不能再用旧稿的前提反对一切检索或漂移机制。

反过来，存在 paths 也不代表任意审计都合理。静态前缀存在，只能说明范围没有明显失联；不能证明模式命中某个文件、所有相关 ADR 都写了范围，或代码遵循了正文。当前约束是已实施 ADR 与代码，旧研究是一份有日期的观察。此次另写报告，保留旧研究原有时间范围。

## 2. 纵向分析：竞争焦点怎样从记录转到使用

### 2.1 原始问题：把为什么留在代码旁边

传统 ADR 工作流把一项决定写成 Markdown，和代码共同审查。轻量模板让决定有上下文、结论与后果，Git 留下修改历史。MADR 是模板体系；adr-tools 是创建与替代记录的 CLI；Log4brains 把 Markdown 变成可预览、可搜索的静态知识站。三者各自增加结构、操作或浏览能力，不能统称 AI 生成器。[MADR](https://adr.github.io/madr/)、[adr-tools](https://github.com/npryce/adr-tools)、[Log4brains](https://github.com/thomvaill/log4brains)

这条演进的关键不是表格越来越长，而是不同环节的摩擦。模板降低写作时“要写什么”的不确定性；CLI 减少命名和关系维护的操作；发布系统减少别人看记录的成本。到 Agent 工作流，读者不只想浏览决策，更需要在具体修改前找到相关约束。用户使用模型并不改变 Git 文档的价值，但改变了文档被消费的时机。

于是出现新的问题：Agent 有能力生成完整段落，却不一定知道当时真正讨论过什么；能读文件，却不一定主动读正确文件；能理解约束，却不一定在下一轮实现时继续遵守。三种失败分别催生捕获、检索和执行产品。这是本报告对生态演进的解释，不是某个仓库作者未公开的创业故事。

### 2.2 adr-gen：把开发轨迹变成写作输入

核验快照显示 adr-gen 初始提交在 2026-02-20，本次 HEAD 只有 5 个提交，package 0.1.2，没有 GitHub release。这描述了可观察的仓库历史，不说明作者没有更早的私人实验，也不保证 npm 发布状态。它采取事后捕获路线：读取 Claude/Codex 会话材料和 Git 变化，筛选架构信号，调用模型生成 ADR，写文件和索引。[历史](https://github.com/dinogit/adr-gen/commits/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/)

这个路线成立的条件是开发过程中本来就说过约束与替代方案。它能省掉事后回忆，但只在材料保留了真实决策时成立。只看差异可以知道换了依赖，不能知道为什么没选另一种；拿无关时间窗口的会话也能凑出一篇完整文件，但完整性会掩盖证据错配。其当前实现有英文关键词与长度预算，说明输入是筛选后的摘要而非完整开发上下文。

短历史与清晰单点定位，让它适合拿来观察最小捕获管线；也提示不要把一次 README 宣称当成熟平台。我们实际跑过它的测试，因此可以判断该快照的确定性管线可工作；没有真实模型评测，不能推断生成内容的平均真实性。这里最有价值的经验，是把捕获过程的每一个信息损失点显露出来。

### 2.3 arch-decision：把决策前的探索变成流程

arch-decision 初始提交为 2026-05-30，本次快照 17 个提交，插件版本 0.1.0，未发现 GitHub release。相比 adr-gen，它从需求开始，组织代码探索、外部调研、方案比较、评审和写作。主要价值载体是技能提示与阶段方法，而非一个证明方案最优的算法。[历史](https://github.com/jsingh6/arch-decision/commits/7d4a1e600da2155d33822b656a9f3e945c697311/)

前置探索容易让候选更丰富，也容易制造流程上的安全感。一个阶段列出三个方案，不代表三个方案真的可行；多个 agent 同意，也不等于证据独立；写了 approval gate，也只说明需要一个显式认可动作。本产品选择由实际回答记录真正替代方案，不靠填满表格产生理由。这使 arch-decision 对我们最有价值的部分落在“探索证据如何进入方案”，而不是把整套编排默认塞入 grill。

其 README 宣称阶段检查点与技能实际断点行为的差别，反映了一种常见成长问题：产品叙述先覆盖理想流程，实现只覆盖其中最容易落地的入口。研究要追实际写入路径，而不只读章节标题。检查点只有真的写了可恢复材料，才算减少了长任务的重做成本。

### 2.4 检索与执行分成两条路线

mbeacom/adrkit 将记录当作结构化数据，围绕 affects 构建“哪些决定治理此次文件变更”的查询，再通过 CLI、MCP 和 GitHub Action 分发。Archgate 则把 ADR 附上可执行规则，关注代码有没有违反规则。两者看起来都能进入 PR，但前者主要组织上下文与发现项，后者执行作者编写的检查；不能因为都能让 CI 失败，就认为它们解决同一类违规。

这是生态当前最值得重视的分叉。文件映射可回答适用范围，却不能证明全文被遵守；可执行规则能证明某一断言，却不能恢复未写成规则的商业取舍。竞争力可以来自更可靠的关联，也可以来自更可靠的检查，二者都要建立在有效数据之上。它们不天然要求新记录格式，然而具体竞品用自己的格式与运行时表达，迁移并不免费。

本次快照 mbeacom/adrkit 已有 v0.20.0，Archgate 已有 v0.60.0，mcp-adr package 为 0.1.0 且未发现 release。版本号本身不用于成熟度横比：每个作者有不同版本习惯。实际消费面、测试路径、错误处理和规则边界更值得审查。维护状态以附录的固定源码与访问日期为准，不预测后续维护承诺。

### 2.5 我们自己的演进改变了借鉴顺序

本仓库最近的两项已交付机制恰好落在捕获与检索。ADR 21 把捕获拆成“注意到、联想到 ADR、足够便宜”，通过用途提示与 note 缓冲解决后两项。缓冲行不成为 implemented，不消耗稳定编号，后续整形成正式记录仍保留质量门槛。它是把低成本放在正确环节，而不是降低记录本身标准。

ADR 22 又把范围写成 paths，通过 relevant 返回命中模式，并在 validate 检查静态前缀。其 rationale 承认范围字段是 MCP 等消费者的基础，但目前只交付 shell 可用的命令。因此我们不需要因为竞品有 affects 就再加第二个同义字段；需要观察的是同一个检索内核怎样抵达真实 PR、非 shell 客户端和错误场景。

ADR 18/19/20 让这两个机制有治理基础：提议不等于交付，拒绝保留反例，历史封存，按上下文价值选择读取。竞品的 accepted 可以对应“认可”，而我们 implemented 声称“交付”；把 Accepted 文件直接移入 implemented 会悄悄改变产品含义。借鉴顺序必须先保护这个区别，再谈自动化效率。

## 3. 横向比较：五款工具分别补哪一段

| 工具 | 核心输入和产物 | 用户为什么会选 | 与我们差异最大的部分 |
| --- | --- | --- | --- |
| adr-gen | 会话摘要 + Git 变化 → 模型 JSON → MADR 与索引 | 开发后省掉重新整理讨论 | 自动生成与平台 hooks |
| arch-decision | 需求 + 代码探索 + 调研 → 方案及 ADR | 决策前研究冷启动 | 多阶段提示编排 |
| mbeacom/adrkit | 结构化记录 + affects + 文件集合 → 上下文与 findings | Agent/PR 精确取回文件范围决定 | MCP 与 PR 消费面 |
| Archgate | ADR + 配套 .rules.ts → 确定性检查结果 | 有可检查约束要在 CI 执行 | 代码规则运行器 |
| mcp-adr | MCP 调用 → 创建、搜索、状态及导出 | 在客户端对话中管理记录 | 可变更的 MCP 管理接口 |
| 本仓库 | 四目录 Markdown + skills + paths → 记录、检索、校验、可视化 | 保留真实取舍并给 Agent 清楚治理规则 | 交付语义、声明 provenance、封存和 deliberation |

表格描述主要责任，不表示某工具只有这一项。我们把代价放进独立分析，不按勾选数量排名。以下路径链接均指固定研究快照，避免 README 之后变了而结论无法复查。

### 3.1 adr-gen：捕获管线可以借，自动认可不能借

核验 SHA：`ca00d49f5f57ae32538b52d3e802f3fb69b3a980`。MIT，Node/TypeScript CLI。官方上手命令及参数以该版本 [README](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/README.md) 为准；本次使用源码 checkout 的 `npm ci --ignore-scripts` 与 `npm test`，没有启用用户 hooks，也没有调用真实模型。复现目录为临时 `/tmp`，不属于研究交付。

实际管线不是“读取完整历史后找出真实决策”。Claude 适配器取 user、assistant、summary 消息，以英文关键词找意图和决策片段。片段在处理阶段有 360/320 字符预算，意图与决策各最多 30 项；user 与 assistant 材料汇入同一 decisionSnippets，没有与我们 raised-by/decided-by 等价的判定声明。Git diff 预算为 12,000 字符，总 prompt 预算为 32,000。时间窗口不相交时还可能退回日期过滤的 sessions。[会话适配器](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/claude-sessions.ts)、[模型输入](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/llm.ts)

模型提示要求依输入证据写作，但没有明确 alternatives 时允许标记为 inferred 的推断。JSON 验证主要检查五个字符串、非空、长度和多余字段，最多两次重试。这能拒绝坏结构，不能拒绝伪造 benchmark。输出写入默认 Accepted；元数据记录 date、branch、会话数与跨度，未为每条 rationale 保存逐项证据锚点。流程没有独立确认步骤，dry-run 可阻止写入。[pipeline](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/pipeline.ts)、[输出](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/adr-files.ts)

架构信号又是一个不同层面的筛选。任意新增文件即可产生信号，依赖、路由、数据库、基础设施变化或英文关键词也可触发。对普通新增文件，这会产生假阳性；对中文讨论，又可能漏掉真实取舍。这里不是说规则没有用，而是把“值得考虑是否记录”误当成“已经够格写正式决定”会扩大产物量。[信号实现](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/architectural.ts)

本次运行 28/28 测试通过，覆盖固定会话材料及 fake model JSON 的 E2E。额外三个无模型探针有可解释结果：编造基准测试理由能通过 parseAndValidateAdr；普通 parser.ts 修改中的纯中文决策讨论未被判为架构信号；没有 commit 窗口交集时能回退到窗口外 session。后两项描述具体输入，不外推所有中文或所有会话都失败。测试通过与三个探针共同表明：实现行为有确定性，但当前校验边界不包括内容真实性。

Claude Stop、Git pre-push/post-merge hook 可自动触发生成，Git hook 使用 `|| true` 不作为阻断。它适合低摩擦提醒，不能当作强制真实记录的治理保证。[hooks](https://github.com/dinogit/adr-gen/blob/ca00d49f5f57ae32538b52d3e802f3fb69b3a980/src/hooks.ts)

借鉴判断：对我们最合适的输入产物是“带来源的候选 note”，不是模型直接写 implemented。候选应保留会话/PR/commit 锚点、明确讨论过还是模型推断、输入是否被截断、时间匹配是否准确；未知 rationale 留空或标待确认。这样会话捕获能补漏，ADR 21 的 note 仍承担低成本入口，正式整形仍受既有规则约束。直接复制生成器的终点会违反 ADR 18 的 shipped 语义。

### 3.2 arch-decision：可以增强探索，不必替换 grill

核验 SHA：`7d4a1e600da2155d33822b656a9f3e945c697311`。Claude Code 插件以 SKILL.md 的流程组织工作，README 描述研究和方案比较，再经显式批准写 ADR。安装方式参考固定版本 [README](https://github.com/jsingh6/arch-decision/blob/7d4a1e600da2155d33822b656a9f3e945c697311/README.md)；本次没有启动真实模型会话，因此不把流程描述当效果测试。

它的优势在信息组织：从需求读取环境和已有决定，探索代码中的边界与依赖，补外部资料，整理多方案，讨论以后再写。对于还不知道有哪些方案的用户，这比立即填一个模板更有帮助。不过“先研究后选择”与“把每个真正 settled 的分支记录下来”是互补关系；探索阶段可以给 grill 更好输入，不必用竞争者的模板替换我们的 deliberation。

当前源码核验发现 README 所述的每阶段 checkpoint 与实际实现不完全对应。技能可在开始时扫描草稿 ADR 以恢复，但未找到每阶段独立写入检查点的完整 writer。最终记录使用 accepted，不等价于我们的 implemented。README 自称 MIT，但该快照未发现 LICENSE 文件，API license 为 null；这是许可证材料缺口，不能把 README 两字当完整授权文本。[固定源码树](https://github.com/jsingh6/arch-decision/tree/7d4a1e600da2155d33822b656a9f3e945c697311)

因此适合借鉴的是探索产物的格式：代码观察对应具体文件/符号，外部事实对应来源，真正不确定的条件单列，再把这些带入方案比较。断点恢复也可做小实验：重要讨论后写出当前已知、已定、仍开放与证据列表，让下次继续时不用重做探索。但它是可恢复任务状态，不是第五种 ADR 生命周期，也不应把“仍待确认”压缩成 settled。

我们已有 grill，且它根据实际回答记录真正选择，反例进入 rejected 记忆，独立可替代选择可拆分记录。全面加入强制多 agent、固定方案数量和每阶段审批，会把一个轻量选择变成编排工程。建议先用复杂案例比较“现有 grill + 证据页”与“完整竞品流程”是否真的改善选择质量，不能凭阶段数量下结论。

### 3.3 mbeacom/adrkit：最值得借的是消费契约

核验 SHA：`d94698cf4142133a166d4af4d33d06a660c2579f`。2026-07-18 创建仓库，最新 GitHub release v0.20.0 发布于 10-11；API 快照 20 stars。Apache-2.0，schema 另有 CC0。它是 TypeScript monorepo，分 core、CLI、evaluator、MCP、CI 和 adapters；开发用 Bun，发布目标 Node 22+，默认目录 docs/adr。上手可用 `npm i -D @adrkit/cli`，再 `npx @adrkit/cli lint` 或 `npx @adrkit/cli explain src/payments/api.ts`。本次仅阅读实现与测试，没有运行完整套件。[固定 README](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/README.md)

其优势不是“有 glob”，而是把匹配依据、生命周期和不完整输入变成跨消费者的一致契约。affects 用 typed matcher 表达作用范围；path 走 picomatch，大小写敏感，默认不匹配隐藏路径；显式 dot segment 可以命中。候选路径把反斜杠改斜杠、去开头 ./。与我们只支持 **、*、? 的最小方言不同，不能不加转换就导入同一套 patterns。[path matcher](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/core/src/affects/matchers/path.ts)

输出 firedMatchers 可以解释为什么命中，我们 relevant 也已显示命中 pattern。真正新增的复杂度在排除和非路径匹配：同一 ADR 任意 negate 命中会压掉整条记录，批量文件场景不是逐文件减集合；package matcher 需要依赖变化快照，缺少输入会返回 inert/info finding，未知 entity/service 也有诊断。因此更复杂的检索未必更直观，它必须同时携带“不知道”的输出，否则会把缺输入伪装成不相关。[resolver](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/core/src/affects/index.ts)

六状态 draft/proposed/accepted/rejected/superseded/deprecated 经同一 status bucket 分成 accepted governing、draft/proposed activeProposals、其余 history。历史 Issue #39 报告过 CLI/CI 与 MCP 对历史记录的判断不一致，当前代码共享函数修正。这是一条有真实缺陷来源的经验：多 transport 最危险的不是响应长得不同，而是悄悄给不同状态不同权威。[bucket](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/core/src/status/bucket.ts)、[Issue #39](https://github.com/mbeacom/adrkit/issues/39)

我们不能照搬其 history 桶。ADR 20 明确 rejected 是当前反例记忆，要检查；archived 才是默认不读的封存历史。未来任何 CLI/MCP/CI 投影都应遵循我们现有三个活跃桶，不为了输出方便把 rejected 藏入 history。另一个不同点是 provenance：它区分 authoredBy 与 ratifiedBy，机器来源 accepted 需 human ratifier 和 deciders，存在 imported 例外。那是一套批准制度，我们的 decided-by 声明选择来源，允许 agent 自己决定；人批准通过也不自动成为 human decided-by。[schema](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/core/src/schema/adr.schema.ts)

MCP 有四个只读 stdio tools：search_decisions、get_decision、get_decision_context、list_superseded。context 只拿逻辑路径匹配，不打开 caller 文件。分页 cursor 绑定 corpus fingerprint、query hash 和 results/findings 通道；换查询或语料后旧 cursor 明确失效。这让长度预算不必靠静默截断解决。仓库还存在 side-effect denial 测试，检查写盘、进程和网络边界。我们没有运行这些测试，不声称已经验证其所有安全性质。[context tool](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/mcp/src/tools/get-decision-context.ts)、[cursor](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/mcp/src/pagination/cursor.ts)、[边界测试](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/mcp/test/side-effect-denial.test.ts)

GitHub Action 给 PR 一个可更新的上下文评论。fork 权限不足时退到 job log；changed-files 超过 provider cap 时停止匹配，避免不完整输入得出 clean。当前版本只在变更 ADR 出现 error finding 时失败，普通 governing 提示不失败。它展示相关决定并检查记录，不证明任意业务代码符合正文。[Action](https://github.com/mbeacom/adrkit/blob/d94698cf4142133a166d4af4d33d06a660c2579f/packages/ci/src/action.ts)

借鉴判断：优先研究把 diff 文件一次性送入现有 relevant 内核，保留命中理由和 lifecycle；显式报告文件集、语料或输出不完整。只读 MCP 可作为另一个消费者，但需要用户确实有无 shell 的使用场景。不要先引入 SDK、第二份索引或新字段，再寻找价值。ADR 22 已明确 MCP 可延期，我们可以在既有数据模型上验证 transport 收益。

### 3.4 Archgate：确定性规则有用，但它是另一种产品责任

核验 SHA：`6075eafb55fc2425537a52690d2d2486e452811d`。仓库创建于 2026-02-23，最新 release v0.60.0 为 10-12；API 快照 72 stars，Apache-2.0。Bun 运行并编译 standalone binary，npm 包提供 binary shim；依赖列在 devDependencies 不代表实现没有依赖。按 [README](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/README.md) 安装后可使用 check 与 review-context。此次未安装到用户环境，也未跑其完整测试。

记录放 `.archgate/adrs`，同 basename 的 `.rules.ts` 是可执行 companion。front matter 使用 id/title/domain/rules，可选 files/respectGitignore；当前 schema 没有 lifecycle status。因此它主要把活跃约束组织为 ADR，并不提供我们 proposed、implemented、rejected、archived 的成熟度与历史治理。[ADR schema](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/formats/adr.ts)

规则 API 支持 glob、grep、JSON/YAML/TOML、base revision 文件读取，以及 TS/JS/Python/Ruby AST。结果带 ADR ID、rule ID、file、line、fix 与 severity，可输出 console/json/GitHub annotation/SARIF。exit 0 表示通过，1 表示违规，2 表示规则运行错误，strict 可使 warning/advisory 失败。这比模型读正文后判断更可复现，但前提是人确实写出了正确规则；能 grep 禁用依赖，不代表能判断一个模块边界是否合理。[rules API](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/formats/rules.ts)、[check](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/commands/check.ts)

规则加载不是简单读配置。rules:true 缺 companion 会 blocked；先检查约定语法和危险源码，再 dynamic import 并验证 RuleSet shape。安全扫描与同进程运行是有限守卫，不是强隔离沙箱。30 秒 timeout 使用 Promise.race，只能处理异步等待，不能据此保证中断同步死循环。复制这种能力会让 ADR Kit 承担执行用户程序、超时、错误隔离和多语言解析器维护，而不只是管理记录。[loader](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/engine/loader.ts)、[runner](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/engine/runner.ts)

比规则引擎更贴近我们的机制是 review-context --base/--staged：通过 diff 给 reviewer 或 agent 相关记录。默认元数据，verbose 才带 Decision 和 Do's/Don'ts，每节默认 2,000 字符；truncatedSections/truncatedBriefings 与 stderr 告知截断，并给 show drilldown。未解析记录进入 unparsedAdrs/diagnostics，不默默消失。strict 可因截断或 advisory 失败。这是上下文预算的诚实契约，尤其适合未来自动消费。[review-context](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/commands/review-context.ts)、[正文预算](https://github.com/archgate/cli/blob/6075eafb55fc2425537a52690d2d2486e452811d/src/engine/adr-sections.ts)

其 files 使用 Bun.Glob；没有 scope 意味影响全部，deleted files 仍计为 changed。我们无 paths 不匹配，且会提醒回到 inventory 阅读。两种规则各有取舍：默认全体减少漏记范围造成的遗漏，成本是上下文量；默认不匹配降低误匹配，成本是不能把零结果当零约束。借鉴应保留我们的语义，再补对覆盖不足的说明，而不是直接换默认。

建议把可执行规则留作独立探索。真实痛点若是“某条已记录依赖约束被重复违反”，先试已有测试或 linter 能否落实，只有重复证据显示需要 ADR 到规则的映射平台，再考虑专门运行器。当前研究不选择引入 DSL、AST 库或 Bun。

### 3.5 mcp-adr：对话操作面丰富，治理模型较浅

核验 SHA：`405d2e7089bae7bcbbb4c49496c85b6e11ea66fd`。2026-04-12 创建，API 快照 0 stars，package 0.1.0，未发现 GitHub release。Python >=3.10，FastMCP/Pydantic/Jinja2；文档安装 `pip install mcp-adr` 或 `uv add mcp-adr`。pyproject 声明 MIT，但 API 未识别 LICENSE，直接复用前需核对许可材料。默认 docs/adr，tool 可带 project_path。[pyproject](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/pyproject.toml)

15 个 MCP tools 覆盖 CRUD、状态、双向 link/supersede、history、diagram、impact、dependencies、HTML export。它降低对话中做管理动作的成本；与 mbeacom 的只读 MCP 不同，接口本身会修改文件。记录是 `# ADR-0001` 加正文粗体元数据，Proposed/Accepted/Deprecated/Superseded 四状态，没有 Rejected。update_status 赋 enum 后重写，未见我们的 transition 约束与封存机制。[server](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/src/mcp_adr/server.py)、[models](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/src/mcp_adr/models.py)、[parser](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/src/mcp_adr/parser.py)

所谓 impact 是 raw Markdown 大小写不敏感 substring，取 first match 附近 excerpt。这是“哪些记录提过这个词”，不能当“哪些决定适用于这个文件”，更不是实际依赖分析。transitive dependencies 只沿 related/supersedes 遍历，不沿 superseded_by；是指定方向的可达子图。[analysis](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/src/mcp_adr/analysis.py)

图示也要分清。单记录 Mermaid/PlantUML tool 返回 instructions 与 ADR context 给模型生成；overview 才有确定性关系图。不能把“提供绘图材料”说成从任意代码自动还原完整架构。[Mermaid](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/src/mcp_adr/diagrams/mermaid.py)

临时 clone 实际运行 `uv run --extra dev pytest -q`，173 passed。它证明本机该套件通过，不证明并发写入、权限与历史不可变都受保护。工作流目录只看到 publish.yml，发布没有先跑测试；本次运行补充了观察，不能改写为竞品已有完整 PR 测试门槛。[发布 workflow](https://github.com/mauriziomocci/mcp-adr/blob/405d2e7089bae7bcbbb4c49496c85b6e11ea66fd/.github/workflows/publish.yml)

可借鉴的是面向动作的接口命名和领域问题清单：迁移要问回滚，集成要问失败模式，安全选择要问威胁条件。当前不需要复制 15 个工具、第二个记录格式或可变更 MCP。我们 graph/tree 已经覆盖确定性可视化；未来若做 transport，应复用现有命令核心而非另建生命周期。

### 3.6 补充参照：追踪元数据与传统 Skill

AgDR 可记录 agent/model/session/trigger，提供规范、validator 与多客户端配置。它有 CC BY 4.0 LICENSE；这些追踪信息是“用什么执行或产出”的证据维度，不能替代“谁决定方向”。其 skill 可在实施前写固定 executed，值得警惕记录时点和状态之间的混淆。[SPEC](https://github.com/me2resh/agent-decision-record/blob/ddebc6ddb9654fc513e6308f11c5dd529ab72df3/SPEC.md)、[Skill](https://github.com/me2resh/agent-decision-record/blob/ddebc6ddb9654fc513e6308f11c5dd529ab72df3/skills/decide/SKILL.md)

传统 architecture-decision-record 资料库也已有 Skill，强调先判断重要性、复用项目格式、一条记录一项决定和真实后果。这说明接入 Agent 不必采用自动生成或独立服务。作者内容为 CC BY-NC-SA 4.0，收录模板有各自许可；本研究借机制，不直接复制文稿。[Skill](https://github.com/architecture-decision-record/architecture-decision-record/blob/cf5c93c6d0cd4e4de02efd47e041eb2275cbf070/skills/architecture-decision-record-skill/SKILL.md)

## 4. 分享断言复核与我们的真实缺口

| 待核验说法 | 核验结果 | 对本仓库的含义 |
| --- | --- | --- |
| adr-gen 用会话与 diff 捕获 | 成立，但筛选/截断/窗口回退，允许 inferred alternatives | 可研究证据候选，不让它直接认可决定 |
| arch-decision 研究后确认写记录 | 技能定义成立，非机械验证；checkpoint 宣称不完整 | 借探索证据，不照搬固定三方案和 approvals |
| mbeacom/adrkit 按文件取上下文 | 成立，共享 bucket，MCP 四只读工具 | 我们已有 paths/relevant，差距在消费面与完整性 |
| Archgate 执行架构约束 | 成立，靠编写 rules.ts 的确定性检查 | 文档本身不是规则，不把 runner 视作沙箱 |
| mcp-adr 搜索、影响、图示 | 工具存在；影响为文本搜索，单记录图为模型上下文 | 不与路径检索/确定性图/代码依赖混为一谈 |
| 一款工具综合效果最好 | 缺统一真实模型实验和用户测量 | 本研究给机制判断，不给质量排行榜 |

我们已有的能力应先列清：四目录、稳定交付编号、声明 provenance、正式 rejection、archive SHA-256 与 base 追加检查、真实 deliberation、离线 graph/tree、用途绑定 skills、一行 note、paths 检索与静态前缀校验。传统浏览和模型生成不自动增加这些治理性质。

当前代码仍有可研究边界。relevant 接受多路径，但没有 Git diff 输入入口；对目录使用最多 2,000 candidates 的有界 walk，跳过 .git/node_modules；到达上限时当前结果没有显式 truncated 标识。无 paths 不匹配；空结果提醒回到标题和正文，但有若干命中不代表无 scope 记录全无关系。validate 静态前缀存在检查也不是完整 glob 命中检查。以上是源码观察，不在本次悄悄修复。

这些边界比“竞争者多一个字段”更适合成为实验。把文件集作为输入可避免 directory walk；明确裁剪可避免虚假完整性；显示 scope 覆盖限制可提醒回看跨模块决定。我们不用把确定性相关性改成语义搜索，也能让输出更可信。新增复杂 matcher 是否值得，还需要遇到路径确实表达不了的真实决定。

## 5. 候选清单：先验证，再决定

优先级表示下一轮研究实验的顺序，不是实现承诺。成本低/中/高是维护面估计，不是工期报价。

| 候选 | 当前覆盖 | 增量价值 | 成本 | 研究建议 |
| --- | --- | --- | --- | --- |
| diff → 批量相关决定 | relevant 已支持多路径 | 输入真实 changed files，包含删除与重命名 | 低到中 | 优先小实验 |
| 完整性诊断 | 空结果有提示，目录 walk 有上限 | 截断、不可读、未解析、无 scope 可见 | 低到中 | 优先小实验 |
| 带证据候选捕获 | note/grill/propose 已有 | 会话/PR 证据补漏，未知理由待确认 | 中 | 次优先实验 |
| 共用检索契约 | core/command 已分离 | 新消费面不改 lifecycle 权威 | 低，随 adapter 发生 | 新消费者前验证 |
| PR 上下文投影 | 手工 relevant + show | reviewer 及时看约束与反例 | 中 | 验证实际使用再做 |
| 只读 MCP | 无，shell 工作流已可用 | 无 shell 客户端获取同一上下文 | 中到高 | 有真实 host 需求再评估 |
| 执行规则平台 | 无，现有 tests/linter 可表达部分 | 对可编码约束确定性检查 | 高 | 暂缓，先找反复违规案例 |
| 自动生成正式 ADR/hooks | settle 时已有低成本入口 | 可能降低漏记，亦增加错误记录 | 中到高 | 不直接复制终点或默认触发 |

### 5.1 实验 A：先把真实 diff 喂给现有 relevant

用 5 个真实或构造小仓库变更作为初始样本：普通修改、删除文件、跨目录 rename、新增未存在文件、代码与 ADR 同时改变。以维护者从 inventory 阅读得到的应读 implemented/proposed/rejected 集合作初始人工基准，输入 new/old 路径到 relevant，比较遗漏、误匹配和需要读多少正文。五个样本只能揭示问题，不能作为总体召回率宣称。

验收重点是 diff 输入的准确性和解释性，不是再实现一个 matcher。删除旧路径应仍能返回治理其原位置的 ADR；rename 两端都应纳入；恶意或特殊文件名不能变成 shell 代码；从子目录执行不能改变 root 语义；无 scope 的全局决定需通过 inventory 补读。默认读取规则仍由 ADR 20 拥有，不能把“路径没有命中”当免读许可。

若输入层证明节省步骤且没有把历史当权威，再另开实现变更讨论 --base/--staged 或 review-context 的具体表面。输出可以先是现有文本；本仓库此前移除了 JSON，不能因为竞品有 JSON 就在研究中悄悄恢复。MCP wire data 若将来需要，是 transport 契约，必须另外研究。

### 5.2 实验 B：让覆盖不足可见

构造超过 walk 上限的目录、一个不能解析的记录、无 paths 的跨模块约束，以及部分记录命中的情况。观察现有输出是否能让调用者区分完整匹配、部分搜索和零命中。调查一次真实 Agent 审查中这些提示是否改变阅读行为，避免为了完美元数据增加没人使用的状态。

候选验收是所有预算或解析失败都不能静默成为 clean；同时保持正常单文件输出简洁。可以区分诊断与结果，不必立即改变 format、增加持久索引或强制 fail。具体错误政策需要专门决策，本报告不选择 fail-open 或 fail-closed。ADR 22 的匹配语义仍是底层约束，ADR 20 的人工相关性阅读补全范围盲点。

### 5.3 实验 C：证据 intake 只输出候选

用公开或合成会话做三个场景：明确人选 A 并拒绝 B；代码改了 A 但没有讨论 B；窗口内无相关会话。每个产物必须能指出来自哪一段输入，不能把 assistant 文字自动当 human 决定，不能把未知理由改写为事实，不能在第三场景静默绑定无关 session。

再加中文、跨会话及截断输入，检查候选是否标出信息损失。与直接 `adrkit note` 比较漏记数、审核时间、错误理由数量。真实数据和模型运行都需届时明确范围；本研究没有先接入用户日志。若工具仅生成更多泛泛候选、却增加人工辨伪，应停止实验而不是靠模板变长掩盖。

这个实验不要求新增 runtime SDK。来源 intake、模型 provider、候选写入可以独立评估；先用现有 Agent 的能力整理可追踪材料，避免复制 adr-gen 的 commander 与多 SDK。正式写 record/propose 时仍要遵循实际 provenance 和已有重复/替代检查。

### 5.4 暂缓项的复核门槛

只读 MCP：至少一个真实目标客户端不能使用 shell，而愿意安装服务；同一语料经 CLI 与 MCP 得到同一 lifecycle/匹配结果，分页失败不能给伪完整集合。ADR 22 已延期此消费者，不需为了竞品清单现在加入。

可执行规则：先找到反复出现、可编码、现有 repo tests 无法经济承担的违规。试写一个普通测试证明规则可判真伪；再比较是否需要 ADR companion 运行器。格式 gate、相关性提示与代码合规必须分开命名和输出。否则只是把已有 linter 包装成更重平台。

研究检查点：用一段长任务中断后恢复，比较重读时间与丢失条件。落盘产物必须明确已定/未定/证据，不借用 implemented 表示研究完成。没有实际恢复实验，不能以“支持 resume”的文案作为验收。

## 6. 横纵交汇：我们应该在哪条线上竞争

### 6.1 竞争不是同一张功能表

adr-gen 起于开发轨迹，最关心低成本产出；arch-decision 起于需求，最关心形成方案；mbeacom 从结构化记录出发，最关心把适用决定送到 agent；Archgate 从规则出发，最关心检测违规；mcp-adr 从客户端动作出发，最关心管理接口。历史起点解释了今天为什么有不同默认终点，也解释了把它们功能相加不一定形成好产品。

我们从记录治理和 Agent 长期记忆出发，已经给出了交付、反例、历史、来源声明的清晰合同。最有机会的方向，是让这套合同在真实修改前被读到，并在捕获时不丢真实性。若为了“AI native”改成猜理由后直接生成 implemented，就会失去当前最明确的差异。若为了“enterprise”直接上规则执行，维护责任可能超过实际需求。

这是一项判断，依据是现有 ADR 与源码，不是流量或收入预测。我们没有足够用户研究证明某个消费面会带来增长；可以证明的是，diff 输入与完整性诊断能针对当前实现中可观察的边界，且不要求另建记录体系。

### 6.2 记录的真实性比生成速度更难追回

生成器可以很快填满一篇 ADR，后续人通常很难分清原始理由和看似合理的补全。一次性文案错误进入持续权威后，就会反复影响未来 agent；archive 封存可以防止历史被改，却不能把一开始虚构的 rationale 变真。因此最便宜的捕获必须停在候选层，真正整形时保留来源和未知项。

本仓库 note 的设计恰好给这个区别一个位置。下一步可以提高输入证据质量，而不是让缓冲替代记录格式。模型身份、git user 和批准操作也各自回答不同问题，不应混写成 decided-by。把这些区分说清，能避免一种很隐蔽的退化：工具越来越自动，记录越来越有权威，真实决定者却越来越难追溯。

### 6.3 可检索、已阅读、已遵守是三种证据

匹配返回说明范围关联；Agent 实际打开并理解正文说明阅读；测试或规则通过说明某条可检查约束成立。三个环节相互促进，但不能替代。mbeacom Issue #39 提示跨消费者需要同一权威语义；Archgate runner 提示执行要有独立边界；adr-gen 探针提示内容结构不能验证事实。

我们可以把“可信结果”的定义放在明确输入、生命周期、匹配理由、完整性与回看路径上。这个方向更容易复现，也更符合 yaml 单依赖的约束。未来如果需要 MCP 或 CI，adapter 应只是同一核心的投影；如果需要合规平台，则应明示它承担新责任，而不是把 validate 名称悄悄扩大到代码符合决定。

### 6.4 三个未来情景

**最可能：小幅强化现有工作流。** 以 diff 取 paths 上下文，保留 inventory 阅读和 show 深读，候选 note 带证据。检索和捕获成本下降，但仍依赖用户维护范围与真实取舍。先用小样本观察是否少漏读，再做消费者适配。这是机制上最贴近当前产品的情景，不是发布计划。

**最危险：功能清单驱动扩张。** 自动 Accepted、多个 SDK、hooks、规则 DSL、MCP 写入同时进入，生命周期与消费者逐渐各自解释。用户得到很多文件，却无法确认哪些已交付、哪些理由推断、哪些输出截断。已有治理价值被多表面一致性和运维成本消耗。危险来自多个已观察的语义错配，不是断言竞品一定失败。

**最乐观：做小而可靠的共同内核。** 四目录作为权威模型，路径作为确定性适用范围，来源证据作为真实性支持，多个消费面只负责及时呈现。同一 corpus 的一致性样例证明任何入口都不会把 proposed 当 shipped、把 rejected 藏入历史或把截断当完整。那时是否加入 MCP 或 PR UI 可以按用户需求选择，核心不随 transport 漂移。

## 7. 证据索引、复现与限制

### 7.1 快照索引

| 项目 | 研究固定版本 | 核验方式 |
| --- | --- | --- |
| luochang212/adr-kit | f76872965115e628888394f78d6e649ca725477c / 0.17.0 | 本地源代码、ADR 18–22、命令输出 |
| dinogit/adr-gen | ca00d49f5f57ae32538b52d3e802f3fb69b3a980 / 0.1.2 | 源码、28 测试通过、3 无模型探针 |
| jsingh6/arch-decision | 7d4a1e600da2155d33822b656a9f3e945c697311 / 0.1.0 | 提示词、配置、模板与历史 |
| mbeacom/adrkit | d94698cf4142133a166d4af4d33d06a660c2579f / v0.20.0 | 源码、测试阅读、API/release 快照 |
| archgate/cli | 6075eafb55fc2425537a52690d2d2486e452811d / v0.60.0 | 源码、测试阅读、API/release 快照 |
| mauriziomocci/mcp-adr | 405d2e7089bae7bcbbb4c49496c85b6e11ea66fd / 0.1.0 | 源码、173 测试通过 |
| me2resh/agent-decision-record | ddebc6ddb9654fc513e6308f11c5dd529ab72df3 | 规范、skill、hook 与 LICENSE |
| architecture-decision-record | cf5c93c6d0cd4e4de02efd47e041eb2275cbf070 | skill 与 LICENSE |

所有外部来源访问于 2026-10-14。正文源码 permalink 已保留。维护元数据来自 [mbeacom API](https://api.github.com/repos/mbeacom/adrkit)、[Archgate API](https://api.github.com/repos/archgate/cli)、[mcp-adr API](https://api.github.com/repos/mauriziomocci/mcp-adr) 及各自 releases/history；创建日期不是产品首发日期。网页缓存可能落后，具体实现以 SHA 为准。没有给传统参照工具做全量源码审计，关于它们仅采用正文所引官方说明。

### 7.2 重跑入口

源码测试应在隔离目录 checkout 对应 SHA 后运行。adr-gen：`npm ci --ignore-scripts`、`npm test`；mcp-adr：`uv run --extra dev pytest -q`。这两套运行的依赖只在临时 checkout，不是本项目新增依赖。测试数量描述这次版本和输入，不是未来所有版本的保证。

探针最小输入：向 adr-gen `parseAndValidateAdr` 填结构合格但虚构 benchmark 的五字段对象；向架构信号入口输入普通 parser.ts 修改与纯中文讨论；向会话选择入口输入无 commit-window overlap 的 sessions。比较 validator errors、architectural detected 和 selected sessions。探针不是模型 benchmark，不用于推导幻觉概率。

后续若做真实效果对比，需同仓库、同任务、同模型、固定上下文和人工可审查基准。至少分别量结构通过、证据支持、遗漏真实决定、虚构替代方案和实际读取行为。不要把一个 pass rate 混合成“ADR 质量”。目前用户口碑与满意度数据暂缺；Issue #39 是一个具体缺陷证据，不能代表全部用户。

### 7.3 方法与研究闭合

采用横纵分析：用可证实的来源与演进解释工具今天的默认责任，再在同一截面对比机制、代价和边界。方法参考 hv-analysis 所述历时/共时框架，篇幅向用户实际关心的竞品差异倾斜；新项目没有丰富公开历史，未为补篇幅编造创始者背景或战略动机。

本研究完成的交付是机制核验、对照和实验候选。没有决定采用新架构，没有制造产品规格，没有用研究完成冒充功能已交付。下一个有价值的问题是：在真实修改中，diff 输入与完整性提示能否让我们少漏读、少误信；选定这个实验后，才需要把候选变成具体实施工作。

### 7.4 尚待补充的现场证据

我们尚未观察到足够多真实用户连续任务，因此不知道路径范围的维护成本是否比漏读成本小，也不知道用户是否愿意在每次重要改动前主动运行 relevant。竞品 issue 能指出一个问题，但无法回答这个问题发生频率；测试能固定语义，但不能测出人愿不愿使用。优先候选的下一阶段应以现场样本补上这个缺口，而不是继续扩大仓库清单。

同样，完整性提示如果每次都很长，可能被习惯性跳过；候选捕获如果产生大量普通实现细节，note 缓冲可能变成无人整形的积压。实验需要记录提示后真实阅读动作和候选被保留的理由。若没有改善，应考虑缩小触发场景或保留手工入口。反证不应该被当作继续扩张功能的理由。

研究的可复核性优先于功能数量：保留反证、输入边界与固定版本，后续才能判断新机制究竟消除了哪一种失败。
