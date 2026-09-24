export const languages = { en: 'English', zh: '简体中文' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

export function getLang(url: URL): Lang {
  return url.pathname.split('/').includes('zh') ? 'zh' : 'en';
}

// Internal links must carry the deployment base (GitHub Pages project
// site is served under /adr-kit/), so they are built from BASE_URL.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function langPath(lang: Lang, path = '') {
  return `${base}${lang === 'zh' ? '/zh' : ''}${path || '/'}`;
}

const ui = {
  en: {
    'meta.title': 'ADR Kit — Architecture Decision Records for AI coding assistants',
    'meta.description':
      "ADR Kit records architecture choices in four Markdown lifecycle folders: proposed, implemented, rejected, and archived.",

    'nav.docs': 'Docs',
    'nav.faq': 'FAQ',
    'nav.github': 'GitHub',

    'hero.tagline': 'Architecture Decision Records for AI coding assistants',
    'hero.lead':
      'ADR Kit turns architecture decisions into plain Markdown files with a machine-checkable lifecycle. Every record must say what problem it solves, what it chose, and what it gave up.',
    'hero.install': 'npm install -g adr-kit',
    'hero.copied': 'Copied',
    'hero.copy': 'Copy',

    'stats.1.value': '1',
    'stats.1.label': 'directory in your repo',
    'stats.2.value': "10",
    'stats.2.label': 'workflow skills',
    'stats.3.value': '0',
    'stats.3.label': 'dependencies added to your repo',
    'stats.4.value': '100%',
    'stats.4.label': 'plain Markdown records',

    'lifecycle.eyebrow': 'Lifecycle',
    'lifecycle.title': 'One decision, one file, one state machine',
    'lifecycle.lead':
      "Four committed folders distinguish unshipped plans, shipped guidance, formal rejections, and frozen history.",
    'lifecycle.proposed': "An unshipped, dated proposal. A settled direction stays here until the work actually ships.",
    'lifecycle.implemented': "A shipped, numbered decision that still guides work.",
    'lifecycle.rejected': "A formally declined proposal, retained with its reason and no ADR number.",
    'lifecycle.archived': "Frozen numbered history; full supersession moves the old record here.",

    'graph.eyebrow': 'Decision graph',
    'graph.title': 'A history you can look at',
    'graph.lead':
      'One command turns the adr/ directory into a live map of your decisions: grouped by date, tinted by tag, linked by the references between them. The map is one self-contained HTML file with a pan-and-zoom canvas, and any view — the map, or one decision\u2019s deliberation card tree — saves as a shareable image.',
    'graph.caption': 'Real graph topology from a production repository; titles generalized',

    'start.eyebrow': 'Get started',
    'start.title': 'Two ways in',
    'start.lead':
      'Paste one line into your AI coding agent and it drives the whole workflow. Prefer running the show yourself? Three commands.',
    'start.agent.label': 'Let your AI agent drive',
    'start.agent.short': 'Simple',
    'start.agent.full': 'Detailed',
    'start.agent.prompt.short':
      'Use github.com/luochang212/adr-kit in this repository to automatically record key architecture decisions.',
    'start.agent.prompt.full':
      "Use github.com/luochang212/adr-kit here. Propose unshipped choices, implement after delivery, and record choices already shipped. Retain formal rejections with reasons. Declare --raised-by and --decided-by on implemented decisions.",
    'start.agents.footnote':
      'Pick one, paste it into your coding assistant, and it will record this repository\u2019s architecture decisions as ADRs.',
    'start.human.label': 'Or run it yourself',
    'start.step1': 'Install the CLI',
    'start.step2': 'Initialize your project',
    'start.step3': 'Start an unshipped proposal',
    'start.node': 'Requires Node.js 20.19 or later.',
    'start.workflows':
      "Small repo? --workflows init,propose,implement,validate installs a lean subset.",

    'faq.eyebrow': 'FAQ',
    'faq.title': 'Questions',
    'faq.1.q': 'What does ADR Kit do to my project when I adopt it?',
    'faq.1.a':
      "It adds one adr/ directory with config, README, and four lifecycle folders: proposed, implemented, rejected, archived. By default it writes agent skills and commands to .agents/; --tools claude adds .claude/ copies, and --tools none installs nothing. Records remain plain Markdown.",
    'faq.2.q': 'How do I use ADR Kit day to day?',
    'faq.2.a':
      "Use adrkit propose for unshipped work, then adrkit implement after delivery. Use adrkit record for an already-shipped choice. Formal rejection requires adrkit reject --reason; retired guidance uses archive or supersede. Fill required sections and run adrkit validate. Visualize with adrkit tree or adrkit graph --html.",
    'faq.3.q': 'Can I use ADR Kit alongside tools like OpenSpec?',
    'faq.3.a':
      'Yes. ADR Kit is an independent decision-record product with its own lifecycle. It can coexist with specification tools because its records live in adr/ and its agent workflows are namespaced; no other tool is required.',

    'footer.tagline': 'Architecture Decision Records for AI coding assistants',
    'footer.docs': 'Documentation',
    'footer.license': 'MIT License',
  },
  zh: {
    'meta.title': 'ADR Kit — 为 AI 编码助手而生的架构决策记录',
    'meta.description':
      "ADR Kit 用四个 Markdown 生命周期目录记录架构选择：proposed、implemented、rejected、archived。",

    'nav.docs': '文档',
    'nav.faq': '常见问题',
    'nav.github': 'GitHub',

    'hero.tagline': '为 AI 编码助手而生的架构决策记录（ADR）',
    'hero.lead':
      'ADR Kit 把架构决策变成纯 Markdown 文件，并带有机检的生命周期。每条记录都必须说清：解决了什么问题、选择了什么、放弃了什么。',
    'hero.install': 'npm install -g adr-kit',
    'hero.copied': '已复制',
    'hero.copy': '复制',

    'stats.1.value': '1',
    'stats.1.label': '只占用一个目录',
    'stats.2.value': "10",
    'stats.2.label': '个工作流技能',
    'stats.3.value': '0',
    'stats.3.label': '给你仓库新增的依赖',
    'stats.4.value': '100%',
    'stats.4.label': '纯 Markdown 记录',

    'lifecycle.eyebrow': '生命周期',
    'lifecycle.title': '一个决策，一个文件，一台状态机',
    'lifecycle.lead': "四个纳入 Git 的目录分别表示未交付提案、已交付指导、正式否决与冻结历史。",
    'lifecycle.proposed': "按日期命名的未交付提案；讨论定向后仍留在这里，直到实际交付。",
    'lifecycle.implemented': "已交付、已编号，仍指导工作的决策。",
    'lifecycle.rejected': "正式否决的提案，保留理由，不分配 ADR 编号。",
    'lifecycle.archived': "冻结的编号历史；完整替代会把旧记录移到这里。",

    'graph.eyebrow': '决策图谱',
    'graph.title': '看得见的历史',
    'graph.lead': '一条命令，把 adr/ 目录变成全部决策的地图：按日期分组、按标签着色、引用连成线。地图是单个自包含的 HTML 文件，画布可拖拽缩放；无论决策地图还是单条决策的卡片树，任意视图都能一键存成图片。',
    'graph.caption': '结构取自真实仓库，标题已做泛化',

    'start.eyebrow': '开始使用',
    'start.title': '两种接入方式',
    'start.lead':
      '把一句话贴给你的 AI 编码 Agent，整个流程由它驱动；想自己掌舵，三条命令就够。',
    'start.agent.label': '交给 AI Agent 驱动',
    'start.agent.short': '简单版',
    'start.agent.full': '详细版',
    'start.agent.prompt.short':
      '在本仓库用 github.com/luochang212/adr-kit 自动记录关键架构决策',
    'start.agent.prompt.full':
      "在本仓库使用 github.com/luochang212/adr-kit。未交付选择用 propose；交付后用 implement；已交付但未记录的选择用 record。正式否决要说明理由。已交付决策用 --raised-by 和 --decided-by 声明来源。",
    'start.agents.footnote':
      '任选一段，贴给你的 AI 编码助手，它就会在本仓库帮你把架构决策记录成 ADR。',
    'start.human.label': '或自己动手',
    'start.step1': '安装 CLI',
    'start.step2': '初始化项目',
    'start.step3': '创建未交付提案',
    'start.node': '需要 Node.js 20.19 或更高版本。',
    'start.workflows':
      "小仓库可装精简子集：--workflows init,propose,implement,validate。",

    'faq.eyebrow': '常见问题',
    'faq.title': 'Q&A',
    'faq.1.q': '引入 ADR Kit 后，它会在我的项目里做什么？',
    'faq.1.a':
      "只添加一个 adr/ 目录，内有配置、README 与 proposed、implemented、rejected、archived 四个目录。默认还将 agent 技能和命令写入 .agents/；--tools claude 另装 .claude/，--tools none 则不安装。记录仍是纯 Markdown。",
    'faq.2.q': '日常如何在项目中使用 ADR Kit？',
    'faq.2.a':
      "未交付工作先用 adrkit propose，交付后运行 adrkit implement；已交付但未记录的选择用 adrkit record。正式否决用 adrkit reject --reason；过时指导用 archive 或 supersede。填写必填章节并运行 adrkit validate。用 adrkit tree 或 adrkit graph --html 可视化。",
    'faq.3.q': 'ADR Kit 能与 OpenSpec 这类工具同时使用吗？',
    'faq.3.a':
      '可以。ADR Kit 是独立的决策记录产品，自有完整生命周期。它的记录位于 adr/，agent 工作流也有命名空间，因此可以与规约工具共存，但不依赖任何其他工具。',

    'footer.tagline': '为 AI 编码助手而生的架构决策记录',
    'footer.docs': '文档',
    'footer.license': 'MIT 许可证',
  },
} as const;

export type UiKey = keyof (typeof ui)['en'];

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
