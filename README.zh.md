<div align="right">
  <a title="English" href="https://github.com/luochang212/adr-kit/blob/main/README.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="https://github.com/luochang212/adr-kit/blob/main/README.zh.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文"></a>
</div>

# ADR Kit

<p>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/v/adr-kit?style=flat-square&color=0e7490" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/dm/adr-kit?style=flat-square&color=0e7490" alt="npm downloads" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/adr-kit?style=flat-square&color=0e7490" alt="node" /></a>
  <a href="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml"><img src="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
  <a href="https://github.com/luochang212/adr-kit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/adr-kit?style=flat-square&color=0e7490" alt="license" /></a>
</p>

<p>
  <img src="https://raw.githubusercontent.com/luochang212/adr-kit/main/assets/social-preview.png" alt="ADR Kit - Open Architecture Decision Records" width="100%" />
</p>

ADR Kit 把架构决策变成纯 Markdown 文件，并带有机检的生命周期：
**proposed → accepted / rejected / superseded**。它借鉴了
[OpenSpec](https://github.com/Fission-AI/OpenSpec) 的 spec-driven 思路，以及
agent 原生代码库的决策记录纪律：每条记录都必须说明它解决什么问题、选择了什么、
放弃了什么。

- 灵活而不僵化
- 纯 Markdown，无 front matter
- 一个决策一个文件
- 同时服务人类和 agent

## 快速开始

需要 Node.js 20.19 或更高版本。

```bash
npm install -g adr-kit
cd your-project
adrkit init
adrkit propose "使用 SQLite 存储会话"
```

`adrkit init` 会创建 `adr/` 目录：

```text
adr/
├── config.yaml      # 项目上下文与分状态规则
├── README.md        # 仓库约定
├── decisions/       # 已接受决策，按 N 编号
├── proposed/        # 待决策提案
└── rejected/        # 已拒绝提案，冻结保存
```

填写提案内容后：

```bash
adrkit validate
adrkit accept "使用 SQLite 存储会话"
adrkit list
```

## 命令

```text
adrkit init [path] [--tools <list>]   初始化 ADR Kit 仓库
adrkit propose <title>                创建提案
adrkit decide <title>                 直接记录已接受的决策
adrkit accept <name>                  接受提案（分配 N 编号）
adrkit reject <name> --reason <text>  拒绝提案
adrkit supersede <name> --by <name>   标记已接受决策被新决策取代
adrkit list [--json]                  列出所有记录
adrkit show <name>                    查看记录
adrkit status [--json]                查看生命周期计数与校验状态
adrkit instructions [--json]          查看下一步；标注待决提案已就绪或需修改
adrkit validate [name] [--all] [--json] 校验单条记录或整个仓库
adrkit update [--tools <list>]         重写 AI 工具集成文件
adrkit config [--json]                查看当前配置
adrkit completion <bash|zsh|fish>     打印 shell 补全脚本
adrkit version                        查看版本
```

`<name>` 支持按标题、文件名或决策编号（`1`）查找。

## 文档

| 文档 | 内容 |
| --- | --- |
| [CLI 参考](https://github.com/luochang212/adr-kit/blob/main/docs/zh/cli.md) | 命令参考：参数与 `--json` 输出 |
| [记录格式](https://github.com/luochang212/adr-kit/blob/main/docs/zh/record-format.md) | ADR 文件格式与校验规则 |
| [工作流](https://github.com/luochang212/adr-kit/blob/main/docs/zh/workflow.md) | 从提案到决策的生命周期 |
| [Agent 技能](https://github.com/luochang212/adr-kit/blob/main/skills/README.md) | 驱动 `adrkit` CLI 的 agent 技能 |

## 记录格式

每条记录都是纯 Markdown，头部固定三行：

```markdown
# ADR: 使用 SQLite 存储会话
Status: proposed

## Problem
...
```

- **Proposed** 需要 `Problem`、`Proposal`、`Alternatives considered`、
  `Acceptance criteria`、`Risks`。
- **Accepted** 需要 `Problem`、`Decision`、`Alternatives considered`、
  `Consequences`；`validate` 会拒绝提案时代的标题出现在已接受决策中。
- **Rejected** 冻结提案，拒绝原因写在状态行：`Status: rejected — <reason>`。
- **Superseded** 决策保留在 `adr/decisions/` 作为历史，状态行指向取代它的决策：
  `Status: superseded by N`。`adrkit supersede <旧> --by <新>` 完成改写；
  `validate` 校验 `N` 存在且自身未被取代。

`adrkit accept` 会自动完成生命周期迁移所要求的改写：`## Proposal` 改为
`## Decision`，`Acceptance criteria` 与 `Risks` 合并进 `## Consequences`。

## 灵感来源

ADR Kit 站在两个项目之上，两者角色不同：

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** 决定了这个工具*怎么建*：
  agent 优先的 CLI、指令以 agent skills 安装、确定性的 `validate`、
  机器可读的 `--json` 输出，以及"灵活而不僵化"的工作流。和 OpenSpec 一样，
  ADR Kit 靠*引导* agent（会话开始可见的 skills），而不是硬性阶段门禁，
  也不强制每次变更都记录。
- **[deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)**
  决定了 ADR Kit 里*记录是什么*。它的 **Agent Notes**：带 `Status:` 行的
  纯 Markdown、生命周期文件夹（`proposed` → `implemented` → `rejected`，
  外加冻结归档）、以及 `Problem` / `Proposal`·`Decision` /
  `Alternatives considered` / `Consequences` 骨架，是 ADR Kit 记录格式的
  直接祖先。

是改编，不是照抄。已接受记录带 `N` 编号，`supersede` 原地退役一条决策，
`accept` 机械地把提案改写成决策。记录一旦接受就不可变：决策记录是历史，
当前事实以代码为准，不在记录里。

## 理念

- **记录是事实来源。** 代码注释会腐化，文档会漂移；一条写明了决定与代价的
  ADR 会持续有用。
- **备选方案是强制项。** 没有记录被否决方案的决策，是在邀请未来的重复争论。
- **生命周期是机械操作，不是编辑操作。** 提案转接受或拒绝、已接受决策被取代，
  都是一条命令，`validate` 强制检查结果形态。
- **Agent 是一等用户。** 纯 Markdown、可预测的路径、需要时可输出 JSON。

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 许可证

[MIT](https://github.com/luochang212/adr-kit/blob/main/LICENSE)
