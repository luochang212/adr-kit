/**
 * English copy for the decision atlas. The shipped template is Chinese; an
 * English page is produced by translating its static chrome and generating the
 * slot values in English, so one frontend serves both languages and the slot
 * contract cannot drift between two files.
 *
 * Exact strings, longest first: a shorter key must never cut through a longer
 * one. Record data is injected after translation, so a record's own prose is
 * never rewritten.
 */

export type AtlasLanguage = 'en' | 'zh';

/** The zh→en table; exported so a test can hold every key against the template. */
export const ATLAS_EN: Array<[string, string]> = [
  ['决策档案', 'Decision record'],
  ['决策摘录', 'DECISION EXTRACT'],
  ['背景摘录', 'CONTEXT EXTRACT'],
  ['取出阅读 ↗', 'Open file ↗'],
  ['请先取出顶层档案', 'Take the top file first'],
  ['已翻阅全部档案', 'All files explored'],
  ['↻ 放回桌面', '↻ Back on the desk'],
  ['<span>1</span>决策密度</a>', '<span>1</span>Density</a>'],
  ['<span>2</span>编号时间线</a>', '<span>2</span>Timeline</a>'],
  ['<span>3</span>引用与替代</a>', '<span>3</span>Relations</a>'],
  ['<span>4</span>演进全景</a>', '<span>4</span>Map</a>'],
  ['<span>5</span>双轴溯源</a>', '<span>5</span>Provenance</a>'],
  ['<span>6</span>记录目录</a>', '<span>6</span>Records</a>'],
  ['ADR Kit · 可选档案页示例', 'ADR Kit · optional decision-atlas example'],
  ['可选展示示例 · 数据为本仓库的 2026-10-21 快照。', 'Optional showcase · a 2026-10-21 snapshot of this repository.'],
  ['用于参考布局与交互；为其他仓库生成页面时，请重新读取其记录并按需要裁剪。', 'Reference layout and interaction; when generating for another repository, read its records and trim as needed.'],
  ['悬停追踪引用，点击查看记录。上下滚动浏览页面；拖拽或横向手势平移图，捏合缩放。', 'Hover to trace references, click to open a record. Scroll to browse the page; drag or swipe to pan the map, pinch to zoom.'],
  ['编号只增不改：横轴按真实日期排布，纵轴就是编号本身；空心点是归档的历史，箭头指向接棒的继任者。', 'Numbers only grow: the horizontal axis is the real date, the vertical axis is the number itself; hollow points are archived history, arrows point to the successor.'],
  ['两个独立的声明字段，均来自生效记录，不推断实际贡献。', 'Two independent declaration fields, both from active records; actual contribution is not inferred.'],
  ['被替代的选择并不消失：2 条记录在此归档，各自指向接棒的继任者；当前约束以生效记录为准。', 'Replaced choices do not disappear: 2 records are archived here, each pointing to its successor; current constraints come from active records.'],
  ['被引最多的决策是后续工作的支点：#18 被引 9 次；计数描述关系，不代表重要性。', 'The most-referenced decision anchors later work: #18 is referenced 9 times; the count describes relations, not importance.'],
  ['26 条记录从 09-20 写到 10-19，落在 11 个不同的日子；09-22 一天就立下 8 条，决策总在同一批工作里成串出现。', '26 records run from 09-20 to 10-19 across 11 distinct days; 09-22 alone produced 8 — decisions arrive in batches.'],
  ['画布可视范围，左右方向键按日期列移动', 'Canvas viewport; arrow keys move by date column'],
  ['ADR 创建日期与编号时间线', 'ADR created date and numbered timeline'],
  ['编号 / 创建日期（UTC）', 'Number / created (UTC)'],
  ['没有匹配的记录，试试其他关键词。', 'No matching records; try another term.'],
  ['画布横向范围索引', 'Canvas range index'],
  ['当前约束请查看生效记录。', 'Current constraints are in the active records.'],
  ['归档历史，已由 ADR ', 'Archived history, superseded by ADR '],
  ['编号、标题、描述或正文', 'Number, title, description, or body'],
  ['决策关系与来源', 'Decision relations and source'],
  ['谁提出，谁决定？', 'Who raised it, who decided?'],
  ['被反复引用的决策', 'Most-referenced decisions'],
  ['哪些选择被后来者替代？', 'Which choices were replaced?'],
  ['被替代 → 后继记录', 'Replaced → successor'],
  ['替代；当前约束请查看生效记录。', ' replaced; current constraints are in active records.'],
  ['决策统计', 'Decision statistics'],
  ['决策地图', 'Decision map'],
  ['决策卡片', 'Decision cards'],
  ['图例', 'Legend'],
  ['放大', 'Zoom in'],
  ['缩小', 'Zoom out'],
  ['缩放级别', 'Zoom level'],
  ['适应画布', 'Fit map'],
  ['含 deliberation tree', 'has deliberation tree'],
  ['演进概览', 'Evolution overview'],
  ['页面章节', 'Page sections'],
  ['回到初始视图', 'Reset view'],
  ['回到顶部', 'Back to top'],
  ['关闭正文', 'Close record'],
  ['源记录 ↗', 'Source record ↗'],
  ['搜索记录', 'Search records'],
  ['定格于', 'Pinned at'],
  ['决策密度', 'Decision density'],
  ['编号时间线', 'Numbered timeline'],
  ['引用与替代', 'References and replacements'],
  ['演进全景', 'The whole map'],
  ['双轴溯源', 'Two-axis provenance'],
  ['记录目录', 'Record directory'],
  ['生效决策', 'Active decisions'],
  ['归档历史。', 'Archived history.'],
  ['归档历史', 'Archived history'],
  ['引用关系', 'References'],
  ['含推敲过程', 'Deliberation trees'],
  ['替代关系', 'Supersede'],
  ['生效记录', 'Active records'],
  ['提出 → ', ' raised → '],
  [' · 归档', ' · archived'],
  [' 条记录 · 生效 ', ' records · active '],
  [' 条记录', ' records'],
  [' 被 #', ' replaced by #'],
  [' 替代', ''],
  ['上一条', 'Previous'],
  ['下一条', 'Next'],
  ['画布外侧', 'Outside the canvas'],
  ['暂无记录', 'No records'],
  ['提出', 'Raised'],
  ['决定', 'Decided'],
  ['创建', 'Created'],
  ['引用了', 'References'],
  ['被引用', 'Referenced by'],
  ['提案', 'Proposed'],
  ['否决', 'Rejected'],
  ['生效', 'active'],
  ['归档', 'archived'],
  // These two are quoted runtime literals in the template. Keeping the quotes
  // in the key stops one character from rewriting future prose ("引用次数"
  // would otherwise become "引用refs数"); any unmatched text then fails the
  // chrome guard test instead of shipping mixed copy.
  ["'人'", "'Human'"],
  ["'次'", "'refs'"],
  // Runtime string concatenation joins labels with the full-width comma; the
  // English page gets the half-width form from the same table.
  ['，', ', '],
];

/** Translate the template's static chrome; record data is injected afterwards. */
export function translateAtlasMarkup(template: string): string {
  let out = template.replace('<html lang="zh-CN">', '<html lang="en">');
  for (const [zh, en] of [...ATLAS_EN].sort((a, b) => b[0].length - a[0].length)) {
    out = out.split(zh).join(en);
  }
  // The map's date-column count label is the one numeric UI string.
  return out.replace(/(\d+) 条/g, '$1 records');
}
