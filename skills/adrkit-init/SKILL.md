---
name: adrkit-init
description: Use when initializing ADR Kit in a repository or when the agent cannot find an adr/ directory.
---

# ADR Kit Init

Installing ADR Kit puts a repository's decision memory where agents can see it: records live in `adr/`, and the `adrkit` CLI reads them. Run `adrkit init [path]` for a new repository, or to repair an existing `adr/` whose `config.yaml` is missing. Repair fills missing files and preserves existing records and integrations. Use `adrkit update` to refresh integrations in an initialized repository. Confirm the four lifecycle folders: `proposed/`, `implemented/`, `rejected/`, and `archived/`. The CLI installs workflow skills but does not rewrite a project's AGENTS.md.

Record language follows the repository: match the language of existing records, or the user's language when the repository has no records yet, and keep that language for both titles and bodies rather than switching per conversation.

Offer one of the sections below for `AGENTS.md` — suggest the one matching the repository's language, judged from the existing AGENTS.md, README, and records, defaulting to English when nothing decides — and paste it only with the user's agreement. A section in another language is a translation of the Chinese source; translate it and keep the `adrkit` invocations verbatim. If AGENTS.md already mentions adrkit in the user's own words, respect that text and suggest nothing. The section names the tool and the record-worthiness bar, and leaves whether or when an agent runs the commands to its judgment.

## 架构决策

本仓库的架构决策记录保存在 `adr/` 目录。可以用 `adrkit` 命令查看：`adrkit list` 列出全部记录，`adrkit show <编号>` 读取一条，`adrkit relevant <路径>` 查找管辖某文件的记录。只记录会影响后续工作的架构选择：代码、测试和现有文档说不清、后来者又可能遗忘的约束与理由才值得记，例行修改留给 Git 和测试。判断时问三件事——会丢失什么、遗忘的代价是什么、哪条稳定的选择该留存；没有值得记的就跳过，不硬凑。写法见 `adrkit-propose`、`adrkit-record` 技能。

## Architecture decisions

This repository keeps its architecture decision records in `adr/`. Browse them with the `adrkit` CLI: `adrkit list` lists all records, `adrkit show <N>` reads one, `adrkit relevant <path>` finds the records governing a file. Record only architectural choices that will guide future work: a constraint or reason that code, tests, and existing docs cannot explain and a later reader might otherwise forget; routine edits belong to Git and tests. Before recording, ask what would be lost, what forgetting would cost, and which stable choice should survive; skip when nothing qualifies rather than inventing a record. The `adrkit-propose` and `adrkit-record` skills carry the format.

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.
