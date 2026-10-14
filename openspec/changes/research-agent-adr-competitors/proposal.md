# Proposal

## Why

用户提供的 ADR 工具推荐分享列出了一批面向 Coding Agent 的竞品；本仓库 2026-09-21 的研究只覆盖两款同名 Python 工具，且随后已上线 note 捕获与 paths 检索。需要重新核验当前竞品机制，判断哪些能力已有、哪些值得借鉴，避免把营销描述或过时缺口当成路线依据。

## What Changes

- 新增 `docs/research/agent-adr-competitors.md`：覆盖 adr-gen、arch-decision、mbeacom/adrkit、Archgate、mcp-adr，并参照传统 ADR 工具与已有研究。
- 记录可追溯的一手来源、取证日期与代码版本，区分文档宣称、代码观察、实际运行和研究判断。
- 对每项候选列出现有覆盖、收益、成本、ADR 约束和后续验证门槛；候选不代表决定采用。
- 在中英文文档入口添加报告链接，提供 PDF 阅读版。
- 纯研究与文档交付，`.openspec.yaml` 声明 `skip_specs: true`。

## Capabilities

### New Capabilities

无。本变更交付竞品研究，不增加产品行为。

### Modified Capabilities

无。不修改运行时、记录格式、生命周期、依赖或现有 capability requirements。

## Impact

- `docs/research/agent-adr-competitors.md`
- `docs/README.md` 与 `docs/zh/README.md`
- `output/pdf/agent-adr-competitors.pdf` 阅读版
- 本变更的 proposal/design/tasks 研究工件
- 现有 ADR 18/19/20/21/22 作为分析约束；不创建或修改 ADR，也不自动打开实现变更。
