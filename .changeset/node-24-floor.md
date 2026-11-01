---
"adr-kit": minor
---

Raise the supported Node.js floor to 24.22. Node.js 22 has entered maintenance (end-of-life April 2027) while Node 24 is the active LTS line the project tracks; the runtime declaration now matches what CI verifies (24.22.0 and 26), and `@types/node` follows the same line instead of the newest Node major.
