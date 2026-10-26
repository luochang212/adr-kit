/** Static theme gallery; the actual atlases keep their shared offline template. */
export function renderThemePreview({ language, pages, screenshots, favicon, commit, repositoryUrl }) {
  const en = language === 'en';
  const title = en ? 'Two ways to read the same history.' : '同一段历史，两种观看方式。';
  const descriptions = en ? {
    folio: ['Light · Editorial', 'Warm paper, generous typography, and a clear view of how decisions connect.'],
    signal: ['Dark · Interactive', 'A desk of decision files. Pick a card and follow the choices behind it.'],
  } : {
    folio: ['浅色 · 编辑式', '暖纸色与舒展的排版，沿着时间和引用，慢慢读懂每一次选择。'],
    signal: ['深色 · 交互式', '一张摆满决策档案的桌面。抽出一张卡片，展开它背后的判断与取舍。'],
  };
  const cards = ['folio', 'signal'].map((theme, i) => {
    const name = theme === 'folio' ? 'Folio' : 'Signal';
    const [label, description] = descriptions[theme];
    const href = pages.find(page => page.theme === theme && page.language === language).file;
    const other = pages.find(page => page.theme === theme && page.language !== language).file;
    return `<article class="theme-card ${theme}">
      <a class="preview" href="${href}" aria-label="${en ? 'Preview' : '预览'} ${name}">
        <img src="${screenshots[theme]}" alt="${name} ${en ? 'decision atlas screenshot' : '决策档案截图'}" width="1440" height="960">
      </a>
      <div class="card-copy"><div class="card-label"><span>0${i + 1}</span><span>${label}</span></div>
        <h2>${name}</h2><p>${description}</p>
        <div class="card-actions"><a class="open" href="${href}">${en ? 'Explore theme' : '进入主题'} <span aria-hidden="true">↗</span></a>
          <a class="other-language" href="${other}" lang="${en ? 'zh-CN' : 'en'}" hreflang="${en ? 'zh-CN' : 'en'}">${en ? '中文预览' : 'English preview'}</a></div>
      </div>
    </article>`;
  }).join('\n');
  return `<!doctype html>
<html lang="${en ? 'en' : 'zh-CN'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ADR Kit · ${en ? 'Theme previews' : '主题预览'}</title>
<link rel="icon" type="image/svg+xml" href="${favicon}">
<style>
  :root { color-scheme: light; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif; background:#eeeae3; color:#302e35; }
  * { box-sizing:border-box; }
  body { margin:0; min-block-size:100dvh; }
  a { color:inherit; text-underline-offset:.25em; }
  a:focus-visible { outline:3px solid #7662a0; outline-offset:5px; }
  .shell { inline-size:min(100% - 3rem,76rem); margin-inline:auto; }
  header { display:flex; flex-wrap:wrap; gap:1rem; align-items:center; justify-content:space-between; padding-block:1.5rem; border-block-end:1px solid #302e3526; }
  .brand { display:flex; align-items:center; gap:.75rem; font-size:.85rem; font-weight:650; letter-spacing:.1em; }
  .brand img { inline-size:2rem; block-size:2rem; }
  .language { padding:.7rem 0; font-size:.85rem; }
  .intro { padding-block:3.5rem 2.5rem; }
  .eyebrow { margin:0 0 1rem; color:#6a5d78; font-size:.7rem; letter-spacing:.18em; }
  h1 { max-inline-size:20ch; margin:0; font-family:Georgia,"Songti SC",serif; font-size:clamp(2rem,1.4rem + 2.5vw,3.6rem); font-weight:400; line-height:1.22; text-wrap:balance; }
  .intro p:last-child { max-inline-size:42rem; margin:1.25rem 0 0; color:#66606b; line-height:1.8; }
  .themes { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,27rem),1fr)); gap:1.5rem; }
  .theme-card { min-inline-size:0; border:1px solid #302e3526; border-radius:.65rem; background:#f8f5ef; }
  .preview { display:block; margin:.75rem .75rem 0; border:1px solid #302e351c; border-radius:.25rem; }
  .preview img { display:block; inline-size:100%; block-size:auto; aspect-ratio:3/2; object-fit:cover; object-position:top; border-radius:inherit; }
  .card-copy { padding:1.5rem 1.75rem 1.75rem; }
  .card-label { display:flex; justify-content:space-between; gap:1rem; color:#756b7c; font-size:.7rem; letter-spacing:.07em; }
  h2 { margin:1rem 0 .6rem; font-family:Georgia,serif; font-size:2.5rem; font-weight:400; }
  .card-copy p { margin:0; min-block-size:3.6em; color:#66606b; font-size:.9rem; line-height:1.8; }
  .card-actions { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-block-start:1.5rem; padding-block-start:1.25rem; border-block-start:1px solid #302e3526; }
  .open { font-size:.9rem; font-weight:600; text-decoration:none; }
  .open span { margin-inline-start:.75rem; }
  .other-language { color:#66606b; font-size:.75rem; }
  footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:.75rem; margin-block-start:2rem; padding-block:1.5rem; border-block-start:1px solid #302e3526; color:#66606b; font-size:.75rem; line-height:1.8; }
  @media (max-width:36rem) { .intro { padding-block:2.5rem 2rem; } .shell { inline-size:calc(100% - 2rem); } .card-copy { padding:1.25rem; } }
</style></head>
<body><div class="shell">
<header><div class="brand"><img src="${favicon}" alt="" width="32" height="32">ADR KIT <span aria-hidden="true">/</span> ${en ? 'DECISION ATLAS' : '决策档案'}</div><a class="language" href="${en ? 'index.html' : 'en.html'}" lang="${en ? 'zh-CN' : 'en'}" hreflang="${en ? 'zh-CN' : 'en'}">${en ? '中文' : 'English'}</a></header>
<main><div class="intro"><p class="eyebrow">THEME PREVIEWS / 01—02</p><h1>${title}</h1><p>${en ? 'The same decisions, references, and original records. Choose a reading experience and explore ADR Kit’s history.' : '相同的决策、引用与原文，不同的阅读节奏。选一种喜欢的方式，走进 ADR Kit 的项目历史。'}</p></div>
<section class="themes" aria-label="${en ? 'Available themes' : '可选主题'}">${cards}</section></main>
<footer><span>${en ? 'Both themes include the full decision atlas.' : '两种主题均包含完整的决策档案。'}</span><span>ADR Kit · <a href="${repositoryUrl}/tree/${commit}">${commit}</a></span></footer>
</div></body></html>\n`;
}
