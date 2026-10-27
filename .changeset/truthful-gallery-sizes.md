---
"adr-kit": patch
---

Reserve the theme gallery screenshots' true aspect ratio: the published gallery reads each PNG's intrinsic size from its header and declares it as the image's width and height, so the preview cards no longer jump into place when the images decode on a phone.
