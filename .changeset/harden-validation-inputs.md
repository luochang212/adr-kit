---
"adr-kit": patch
---

Harden record reading against crafted input. A section's "written content" now
means text outside HTML comments: an unterminated `<!--` is not content and
swallows the rest of the section, so a draft whose sections hold only comment
markers is refused instead of reported ready to accept, and a durable record
with such a section fails validation. The comment strip is a single linear
scan, so a record carrying hundreds of kilobytes of unterminated markers no
longer makes `validate`, `status`, or `instructions` run for minutes. A path
read as a record must resolve to a regular file: a directory, FIFO, socket, or
device — including a symlink to one — is reported by its kind instead of being
read; previously a FIFO blocked the read and a link to `/dev/zero` read
forever. A symbolic link to a regular file is still read as a record.
