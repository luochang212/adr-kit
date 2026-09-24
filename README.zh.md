<div align="right">
  <a title="English" href="https://github.com/luochang212/adr-kit/blob/main/README.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="https://github.com/luochang212/adr-kit/blob/main/README.zh.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文"></a>
</div>

# ADR Kit

<p>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/v/adr-kit?style=flat-square&color=0e7490" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/adr-kit"><img src="https://img.shields.io/npm/dm/adr-kit?style=flat-square&color=0e7490" alt="npm downloads" /></a>
  <a href="https://github.com/luochang212/adr-kit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/adr-kit?style=flat-square&color=0e7490" alt="license" /></a>
  <a href="https://zread.ai/luochang212/adr-kit"><img src="https://img.shields.io/badge/%E2%80%8B-zread-0e7490?style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff" alt="zread" /></a>
  <a href="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml"><img src="https://github.com/luochang212/adr-kit/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
</p>

<p>
  <img src="./assets/readme-banner.png" alt="ADR Kit" width="100%" />
</p>

ADR Kit 用纯 Markdown 记录架构决策，并以四个目录表示完整生命周期：`proposed/` 是未交付提案，`implemented/` 是已交付且仍有指导意义的决策，`rejected/` 保存正式否决及理由，`archived/` 保存冻结历史。它是独立的、面向人与 agent 的决策记录工具。

## 快速开始

需要 Node.js 20.19 或更新版本。

```bash
npm install -g adr-kit
cd your-project
adrkit init
adrkit propose "使用 SQLite 存储会话"
# 填写提案，实际交付后：
adrkit implement "使用 SQLite 存储会话" --raised-by human --decided-by human
adrkit validate
```

已交付但尚未记录的选择可直接用 `adrkit record "<标题>" --raised-by human --decided-by human`。

```text
adr/
├── config.yaml
├── README.md
├── proposed/       # 按日期命名，未编号，尚未交付
├── implemented/    # 已编号、已交付，当前指导
├── rejected/       # 按日期命名，保留否决理由
└── archived/       # 保留编号，冻结历史
```

未提交的提案只是本地工作树草稿；Git 提交后成为共享提案，不另设 `.drafts/`。讨论已定方向但尚未交付时仍在 `proposed/`。正式否决必须用 `adrkit reject --reason` 留痕。完整替代用 `adrkit supersede --by` 并自动归档旧记录；当现状已有其他权威来源、原决策不再指导未来时，可用 `adrkit archive --reason` 归档。不要按年龄或配额归档；部分替代仍保留有效的现行记录。

## 告诉 Agent

将[任务开始阅读规则](docs/zh/workflow.md#任务开始前阅读决策)加入 `AGENTS.md` 或 `CLAUDE.md`。任务开始时先运行 `adrkit list`，完整阅读相关的 implemented 记录，检查相关 proposed/rejected 记录，仅在需要历史上下文时读 archived。不能只看标题判断相关性。`adrkit-init` 指导配置，`adrkit update` 刷新已安装技能。

## 命令

```text
adrkit init [path] [--tools <list>] [--workflows <list>]
adrkit propose <title>
adrkit implement <name> --raised-by <human|agent> --decided-by <human|agent>
adrkit record <title> --raised-by <human|agent> --decided-by <human|agent>
adrkit reject <name> --reason <text>
adrkit archive <name> --reason <text>
adrkit supersede <old> --by <new>
adrkit list
adrkit show <name>
adrkit status
adrkit instructions
adrkit validate [name] [--all]
adrkit update [--tools <list>] [--workflows <list>]
adrkit config
adrkit graph [--mermaid|--dot|--text|--html] [--formal-only] [--tag <tag>] [--out <path>]
adrkit tree <name> [--mermaid|--text|--html]
adrkit completion <bash|zsh|fish>
adrkit version
```

默认把集成安装到 `.agents/`；`--tools claude` 另装 `.claude/`，`--tools none` 不安装。可用 `--workflows init,propose,implement,validate` 选子集。

## 记录格式

已交付决策在 `adr/implemented/N-slug.md`：

```markdown
---
status: implemented
date: 2026-09-25
raised-by: human
decided-by: human
created: 2026-09-24
tags: [storage]
---

# ADR: 1 使用 SQLite 存储会话

## Problem

...

## Decision

...

## Alternatives considered

...

## Consequences

...
```

提案按日期命名，使用 `Problem`、`Proposal`、`Alternatives considered`、`Acceptance criteria`、`Risks`。`date` 在每次生命周期转移时由 CLI 写入；`created` 保留创建日期。`raised-by` 与 `decided-by` 分别声明谁提出、谁定下已交付选择，不表示谁运行命令或批准部署。CLI 不能验证交付或来源。`tags` 提供主题分类，不额外引入类别目录。`adrkit validate` 检查全部四个目录；新模板未填完时按预期失败。

implemented 记录可以更新路径、符号、默认值等已交付事实，但不可悄悄重写选择或理由。选择改变应新建记录并建立关系。完整替代写入 `superseded-by: N`，旧记录移入 `archived/`；归档记录保持编号，只作历史参考。图谱包含编号历史，可选 `## Deliberation` 附录保留思辨树。

详见[记录格式](docs/zh/record-format.md)、[工作流](docs/zh/workflow.md)与[CLI 参考](docs/zh/cli.md)。

## 灵感来源

[DeepSeek Harness Agent Notes](https://github.com/deepseek-ai/deepseek-harness) 启发了生命周期目录及 proposed、implemented、rejected、archived 的语义。ADR Kit 保留自身的来源声明、稳定编号、校验、思辨树和关系图。OpenSpec 不是运行时或治理依赖。

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 许可证

MIT。
