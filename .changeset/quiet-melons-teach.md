---
"adr-kit": patch
---

Bind adr/'s purpose to every agent-facing surface and mirror the settle moment in capture-side skill descriptions.

The standing orders, the generated `adr/README.md`, `adrkit instructions` output, and each workflow skill now open with one line stating the failure modes adr/ exists to block (mid-task drift from long-term decisions, forgetting settled choices), so agents learn the why along with the obligations. The `adrkit-propose`, `adrkit-record`, and `adrkit-grill` descriptions are rewritten in situational language because descriptions are the retrieval key in skill-based agents: they must mirror the moment ("catch yourself settling a choice future work must live with"), not the tool's category. The purpose sentence is shared between the template and the dogfooded AGENTS.md, machine-checked by a new test.
