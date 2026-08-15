# 工作流

## 提案优先

```text
openadr init
openadr propose "使用 SQLite 存储会话"
# 填写草稿
openadr validate
openadr accept "使用 SQLite 存储会话"
```

`openadr accept` 会自动完成生命周期迁移所要求的改写：

- `## Proposal` 改为 `## Decision`
- `Acceptance criteria` 和 `Risks` 合并进 `## Consequences`
- 文件从 `adr/proposed/` 移动到 `adr/decisions/NNNN-slug.md`

## 拒绝提案

```text
openadr reject "使用 SQLite 存储会话" --reason "我们最终选择了 JSON 文件"
```

提案冻结在 `adr/rejected/`，原因写入状态行。

## 直接记录已接受决策

```text
openadr decide "使用 SQLite 存储会话"
# 填写草稿
openadr validate 0001
```

## Agent 工作流

Agent 可以通过 JSON 输出来驱动同样的生命周期：

```bash
openadr status --json
openadr instructions --json
openadr validate --json
```
