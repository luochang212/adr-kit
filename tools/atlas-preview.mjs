/** Static theme gallery; the actual atlases keep their shared offline template.
 *  Each screenshot arrives with its intrinsic size and is declared as the
 *  img's width and height: a reservation that drifts from the PNG's true
 *  ratio shifts the cards the moment the image decodes. */
export function renderThemePreview({ language, pages, screenshots, favicon }) {
  const en = language === 'en';
  const copy = en ? {
    brand: 'Decision atlas',
    heading: 'One history.',
    emphasis: 'Two perspectives.',
    lede: 'Every decision has a story. Find your way into ours.',
    note: 'The same complete history. Two ways to explore it.',
    stage: 'Choose your reading experience',
    preview: 'Open',
    open: 'Explore',
    themes: {
      folio: 'The editorial view',
      signal: 'The exploratory view',
    },
  } : {
    brand: '决策档案',
    heading: '一段历史。',
    emphasis: '两种视角。',
    lede: '每个决定，都有来处。选一种方式，走进我们的故事。',
    note: '同一段完整历史，两种探索方式。',
    stage: '选择你的阅读方式',
    preview: '打开',
    open: '进入',
    themes: {
      folio: '像读一本刊物',
      signal: '像打开一份档案',
    },
  };
  const cards = ['folio', 'signal'].map((theme, i) => {
    const name = theme === 'folio' ? 'Folio' : 'Signal';
    const label = copy.themes[theme];
    const href = pages.find(page => page.theme === theme && page.language === language).file;
    const shot = screenshots[theme];
    return `<article id="${theme}" class="theme-card ${theme}" aria-labelledby="${theme}-title">
      <div class="card-meta"><span class="index">0${i + 1}</span><span>${label}</span></div>
      <div class="card-heading"><h2 id="${theme}-title">${name}</h2></div>
      <a class="preview" href="${href}" aria-label="${copy.preview} ${name}">
        <img src="${shot.src}" alt="${name} ${en ? 'decision atlas screenshot' : '决策档案截图'}" width="${shot.width}" height="${shot.height}">
      </a>
      <div class="card-actions"><a class="open" href="${href}">${copy.open} ${name}<span aria-hidden="true">↗</span></a>
      </div>
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="${en ? 'en' : 'zh-CN'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ADR Kit · ${en ? 'Theme previews' : '主题预览'}</title>
<meta name="description" content="${copy.lede} ${copy.note}">
<link rel="icon" type="image/svg+xml" href="${favicon}">
<style>
  :root { color-scheme:light; --paper:#eeeade; --ink:#23251f; --muted:#5d6056; --accent:#b63620; --rule:#c6c5b8; --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; --serif:Georgia,"Songti SC","STSong",serif; --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-family:var(--sans); color:var(--ink); background:var(--paper); }
  * { box-sizing:border-box; }
  body { margin:0; min-block-size:100dvh; display:flex; flex-direction:column; }
  a { color:inherit; text-underline-offset:.3em; }
  a:focus-visible { outline:3px solid var(--accent); outline-offset:5px; }
  ::selection { background:var(--accent); color:var(--paper); }
  .shell { inline-size:min(100% - 4rem,100rem); margin-inline:auto; }
  header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem; padding-block:.6rem; border-block-end:1px solid var(--rule); }
  .brand { display:flex; flex-wrap:wrap; align-items:baseline; gap:.8rem; font-size:.76rem; }
  .brand strong { font-size:1.05rem; font-weight:700; letter-spacing:-.045em; }
  .brand-divider { color:var(--accent); }
  .language { display:inline-flex; align-items:center; justify-content:center; min-block-size:2.75rem; padding-inline:1rem; border:1px solid var(--rule); font-size:.75rem; text-decoration:none; }
  .language:hover { background:var(--ink); color:var(--paper); }
  .intro { padding-block:1rem; display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:.5rem 2rem; }
  h1 { margin:0; font-size:clamp(1.5rem,2.7vw,2.75rem); font-weight:550; line-height:1.15; letter-spacing:-.045em; }
  h1 span { display:inline; }
  h1 em { margin-inline-start:.12em; display:inline; font-family:var(--serif); font-weight:400; letter-spacing:-.04em; color:var(--accent); }
  .intro p { margin:0; color:var(--muted); font-size:.75rem; line-height:1.6; }
  .stage { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-block-end:1px solid var(--rule); flex:1; align-items:center; background:linear-gradient(100deg,#f5f1e7 50%,#101d1b 50.1%); padding-block:.75rem; }
  .theme-card { --title-size:clamp(5rem,min(1rem + 10vw,15dvh),10rem); --card-ink:var(--ink); --card-muted:var(--muted); --card-rule:#c6c5b8; --card-accent:var(--accent); min-inline-size:0; padding:.75rem clamp(1.5rem,4vw,5rem); color:var(--card-ink); background:none; position:relative; padding-inline:clamp(1.5rem,3.5vw,4rem); }
  .signal { --card-ink:#f0f0e5; --card-muted:#b6bdb9; --card-rule:#444f4a; --card-accent:#ff8064; background:none; padding-block:.25rem 0; padding-inline-start:clamp(3rem,6vw,7rem); }
  .theme-card a:focus-visible { outline-color:var(--card-accent); }
  .card-meta { display:flex; flex-wrap:wrap; gap:.7rem; align-items:center; font-size:.65rem; color:var(--card-muted); letter-spacing:.06em; text-transform:uppercase; }
  .index { font-variant-numeric:tabular-nums; color:var(--card-accent); display:inline-grid; place-items:center; inline-size:1.8rem; block-size:1.8rem; border:1px solid currentColor; border-radius:50%; }
  .card-heading { text-decoration:none; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding-block:.35rem .5rem; position:relative; z-index:1; padding:0; pointer-events:none; }
  h2 { margin:0; font-size:var(--title-size); font-weight:400; line-height:.88; letter-spacing:-.06em; }
  .folio h2 { font-family:var(--serif); font-style:italic; }
  .signal h2 { font-family:var(--mono); font-weight:600; letter-spacing:-.04em; font-size:calc(var(--title-size)*.85); }
  .preview { display:block; border:1px solid var(--card-rule); --shadow-color:#b63620; --shadow-x:.8rem; --shadow-y:1.4rem; --shadow-spread:-.6rem; box-shadow:calc(var(--shadow-x) + var(--shadow-shift,0rem)) calc(var(--shadow-y) + var(--shadow-shift,0rem)) 0 var(--shadow-spread) var(--shadow-color); transition:box-shadow .25s ease; inline-size:100%; min-inline-size:0; position:relative; }
  .preview img { display:block; inline-size:100%; block-size:auto; }
  .preview:focus-visible { --shadow-shift:.4rem; }
  @media (hover:hover) { .preview:hover { --shadow-shift:.4rem; } }
  .card-actions { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.6rem 1.5rem; padding-block-start:0; border-block-start:1px solid var(--card-rule); max-inline-size:29rem; border:0; }
  .open { display:inline-flex; align-items:center; gap:1rem; min-block-size:2.75rem; font-size:1rem; font-weight:550; text-decoration:none; }
  .open span { display:inline-grid; place-items:center; inline-size:2.5rem; block-size:2.5rem; border:0; border-radius:50%; color:#fff; transition:transform .2s ease,background .2s ease; background:var(--card-accent); font-size:1.5rem; }
  .open:is(:hover,:focus-visible) { color:var(--card-accent); }
  .open:is(:hover,:focus-visible) span { transform:rotate(45deg); background:var(--card-accent); }
  footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.7rem 2rem; padding-block:.65rem; color:var(--muted); font-size:.7rem; line-height:1.6; }
  :lang(zh-CN) .intro h1 { font-size:clamp(1.35rem,1.05rem + 1.4vw,2.2rem); font-weight:600; letter-spacing:0; line-height:1.35; }
  :lang(zh-CN) .intro h1 em { margin-inline-start:.35em; font-style:normal; font-weight:600; letter-spacing:.02em; }
  main { flex:1; display:flex; flex-direction:column; }
  .folio { padding-block:0 .5rem; z-index:2; }
  .folio .card-heading { margin-inline-start:-.5rem; transform:rotate(-5deg); margin-block:.3rem -.2rem; }
  .signal .card-heading { margin-inline-start:0; margin-block:.4rem .75rem; }
  .folio .preview { margin-inline-start:2rem; max-inline-size:calc(100% - 2rem); inline-size:min(calc(100% - 2rem),max(12rem,calc((100dvh - 25rem)*1.5))); transform:rotate(2deg); margin-block:calc(var(--title-size)*-.5) 1.6rem; }
  .signal .preview { inline-size:min(calc(100% - 2.25rem),max(12rem,calc((100dvh - 25rem)*1.5))); margin-inline-start:1.75rem; transform:rotate(-3deg); margin-block:calc(var(--title-size)*-.425) 1.6rem; --shadow-color:#35423c; --shadow-x:.7rem; --shadow-y:.9rem; --shadow-spread:-.3rem; }
  .folio .card-actions { margin-inline-start:2rem; }
  .signal .card-actions { margin-inline-start:1.75rem; }
  .mobile-nav { display:none; }
  .signal .open span { color:#101d1b; }
  .intro h1 { font-weight:750; }
  footer strong { text-transform:uppercase; letter-spacing:.08em; }
  @media (max-width:47.5rem) {
    .shell { inline-size:calc(100% - 2.5rem); }
    .intro { display:block; padding-block:.75rem; }
    .intro p { margin-block-start:.45rem; }
    .mobile-nav { display:flex; gap:1.5rem; align-items:center; margin-block-start:.5rem; font-size:.75rem; }
    .mobile-nav a { display:inline-flex; align-items:center; min-block-size:2.75rem; }
    .mobile-nav span { color:var(--muted); margin-inline-start:auto; }
    .stage { display:flex; align-items:stretch; overflow-x:auto; scroll-snap-type:x mandatory; scroll-padding-inline:1rem; background:var(--paper); gap:.75rem; padding:0 1rem; }
    .theme-card { flex:0 0 92%; min-inline-size:0; padding:1rem; scroll-snap-align:start; background:#f5f1e7; }
    .signal { background:#14201e; }
    .theme-card { --title-size:clamp(4rem,1rem + 17vw,6rem); }
    .signal .card-heading,.folio .card-heading { margin:.5rem 0; transform:none; }
    .folio .preview,.signal .preview { max-inline-size:100%; inline-size:100%; min-inline-size:0; transform:none; margin:.75rem 0 1rem; --shadow-color:var(--card-accent); --shadow-x:.4rem; --shadow-y:.5rem; --shadow-spread:-.2rem; }

    .folio .card-actions,.signal .card-actions { margin-inline-start:0; }
    .card-actions { gap:0 .5rem; }
    .open { gap:.6rem; }
    footer { font-size:.65rem; }
  }
  @media (prefers-reduced-motion:reduce) { .preview,.open span { transition:none; } .open:is(:hover,:focus-visible) span { transform:none; } }
</style></head>
<body>
<header class="shell"><div class="brand"><strong>ADR KIT</strong><span class="brand-divider" aria-hidden="true">/</span><span>${copy.brand}</span></div><a class="language" href="${en ? 'index.html' : 'en.html'}" lang="${en ? 'zh-CN' : 'en'}" hreflang="${en ? 'zh-CN' : 'en'}">${en ? '中文' : 'English'} <span aria-hidden="true">&nbsp;↗</span></a></header>
<main><div class="intro shell"><h1><span>${copy.heading}</span> <em>${copy.emphasis}</em></h1><p>${copy.note}</p><nav class="mobile-nav" aria-label="${copy.stage}"><a href="#folio">Folio ↗</a><a href="#signal">Signal ↗</a><span>${en ? 'Swipe to explore →' : '左右滑动 →'}</span></nav></div>
<section class="stage" aria-label="${copy.stage}">${cards}</section></main>
<footer class="shell"><strong>ADR Kit</strong><span>${copy.brand}</span></footer>
</body></html>\n`;
}
