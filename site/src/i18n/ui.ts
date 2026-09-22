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
      'ADR Kit turns architecture decisions into plain Markdown files with a machine-checkable lifecycle. Decisions are durable records; proposals are ephemeral drafts. Built for humans and AI agents.',

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
    'stats.2.value': '9',
    'stats.2.label': 'workflow skills',
    'stats.3.value': '0',
    'stats.3.label': 'dependencies added to your repo',
    'stats.4.value': '100%',
    'stats.4.label': 'plain Markdown records',

    'lifecycle.eyebrow': 'Lifecycle',
    'lifecycle.title': 'One decision, one file, one state machine',
    'lifecycle.lead':
      'Decisions are durable records; proposals are ephemeral drafts. The CLI stamps the date and git commit at every move and refuses invalid transitions.',
    'lifecycle.draft': 'An ephemeral draft in adr/.drafts/. Promoted into a decision by accept, or discarded by reject; it never becomes a durable state.',
    'lifecycle.accepted': 'A durable, numbered decision in decisions/. The record is immutable history; current facts live in code.',
    'lifecycle.rejected': 'A rejected idea is not a record: it lives in the winner\u2019s \u201cAlternatives considered\u201d so the no never disappears.',
    'lifecycle.superseded': 'Replaced by a newer decision. Stays in decisions/ as history, linked to its successor.',

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
      'Use github.com/luochang212/adr-kit in this repository. Record each key architecture decision as an ADR: prefer adrkit decide for calls already made; use adrkit propose only when one still needs review, then adrkit accept once it settles. Every record declares --raised-by (who put the decision on the table) and --decided-by (whose judgment settled it): human when a person determined the direction, agent when the choice came from your own judgment, even if a person let it through.',
    'start.agents.footnote':
      'Pick one, paste it into your coding assistant, and it will record this repository\u2019s architecture decisions as ADRs.',
    'start.human.label': 'Or run it yourself',
    'start.step1': 'Install the CLI',
    'start.step2': 'Initialize your project',
    'start.step3': 'Record your first decision',
    'start.node': 'Requires Node.js 20.19 or later.',
    'start.workflows':
      'Small repo that only records decisions? --workflows init,decide,validate installs a lean subset.',

    'faq.eyebrow': 'FAQ',
    'faq.title': 'Questions',
    'faq.1.q': 'What does ADR Kit do to my project when I adopt it?',
    'faq.1.a':
      'It adds one adr/ directory: a config file, a README with the conventions, and a decisions/ folder. Ephemeral proposal drafts live in a gitignored adr/.drafts/ that the CLI creates on demand. By default it also writes agent skills and commands to .agents/; adrkit init --tools claude adds .claude/ copies for Claude Code, and --tools none installs nothing. That is all: records are plain Markdown, there is no runtime dependency, no service, and no lock-in; delete the directory and everything is gone.',
    'faq.2.q': 'How do I use ADR Kit day to day?',
    'faq.2.a':
      'Run adrkit decide "<title>" --raised-by human --decided-by human to record a decision that is already made; use adrkit propose "<title>" only when one still needs review. Fill in the required sections (Problem, Decision, Alternatives considered, Consequences) and run adrkit validate until it passes. If you proposed, adrkit accept "<title>" --raised-by human --decided-by human numbers the decision and promotes the draft into decisions/. Declare agent instead when the direction came from the agent\'s own judgment, including when a person only let it through. AI coding assistants can drive the same workflow through the installed skills: you review, they type. When you want to look at the records, ask for a visualization: one decision\u2019s deliberation renders as a card tree (adrkit tree), the whole set renders as a decision map (adrkit graph --html), and any view saves as a shareable PNG.',
    'faq.3.q': 'Can I use ADR Kit alongside tools like OpenSpec?',
    'faq.3.a':
      'Yes: they answer different questions. Spec-driven tools like OpenSpec track what you are building and how it changes; ADR Kit records why a technical direction was chosen and what was given up. Many teams run both: OpenSpec manages the change, and the pivotal choices inside it become ADRs. They live in separate directories and never conflict.',

    'footer.tagline': 'Architecture Decision Records for AI coding assistants',
    'footer.docs': 'Documentation',
    'footer.license': 'MIT License',
  },
  zh: {
    'meta.title': 'ADR Kit — 为 AI 编码助手而生的架构决策记录',
    'meta.description':
      'ADR Kit 把架构决策变成纯 Markdown 文件，并带有机检的生命周期。决策是持久记录，提案是临时草稿。人和 AI Agent 都能用。',

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
    'stats.2.value': '9',
    'stats.2.label': '个工作流技能',
    'stats.3.value': '0',
    'stats.3.label': '给你仓库新增的依赖',
    'stats.4.value': '100%',
    'stats.4.label': '纯 Markdown 记录',

    'lifecycle.eyebrow': '生命周期',
    'lifecycle.title': '一个决策，一个文件，一台状态机',
    'lifecycle.lead': '决策是持久记录，提案是临时草稿。CLI 在每次状态迁移时盖日期与 commit 戳，并拒绝非法流转。',
    'lifecycle.draft': 'adr/.drafts/ 里的临时草稿。被 accept 提升为决策，或被 reject 丢弃；它从来不是持久状态。',
    'lifecycle.accepted': 'decisions/ 里的持久编号决策。记录是不可变历史；当前事实以代码为准。',
    'lifecycle.rejected': '被否决的想法不是记录：它留在胜出决策的 “Alternatives considered” 里，让“不”永不消失。',
    'lifecycle.superseded': '被更新的决策取代。作为历史留在 decisions/，并链接到继任者。',

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
      '在本仓库使用 github.com/luochang212/adr-kit。每做一次关键架构决策就记一条 ADR：已定夺的优先用 adrkit decide，只有仍需评审时才用 adrkit propose，落定后再 adrkit accept。每条记录都要声明 --raised-by（谁把决策提上台面）与 --decided-by（谁的判断定下了它）：方向由人决定用 human，由你自己的判断得出用 agent，即使人只是放行。',
    'start.agents.footnote':
      '任选一段，贴给你的 AI 编码助手，它就会在本仓库帮你把架构决策记录成 ADR。',
    'start.human.label': '或自己动手',
    'start.step1': '安装 CLI',
    'start.step2': '初始化项目',
    'start.step3': '记录第一个决策',
    'start.node': '需要 Node.js 20.19 或更高版本。',
    'start.workflows':
      '只记录决策的小仓库可装精简子集：--workflows init,decide,validate。',

    'faq.eyebrow': '常见问题',
    'faq.title': 'Q&A',
    'faq.1.q': '引入 ADR Kit 后，它会在我的项目里做什么？',
    'faq.1.a':
      '只添加一个 adr/ 目录：一个配置文件、一份写明约定的 README、一个 decisions/ 文件夹。临时提案草稿放在 gitignored 的 adr/.drafts/ 里，由 CLI 按需创建。默认还会把 agent skills 和命令写入 .agents/；adrkit init --tools claude 额外写一份 .claude/ 给 Claude Code，--tools none 则不安装。仅此而已：记录是纯 Markdown，没有运行时依赖、没有服务、没有锁定；删掉目录就什么都不剩。',
    'faq.2.q': '日常如何在项目中使用 ADR Kit？',
    'faq.2.a':
      '已做的决策直接运行 adrkit decide "<标题>" --raised-by human --decided-by human；只有仍需审议时才用 adrkit propose "<标题>"。填满必填章节（问题、决策、备选、后果），反复运行 adrkit validate 直到通过。如果走了提案，adrkit accept "<标题>" --raised-by human --decided-by human 为决策编号并把草稿提升进 decisions/；方向由 AI 自主判断得出时写 agent，人只是放行也写 agent。AI 编码助手可以通过安装的技能驱动同一流程：它动手，你审阅。想直观查看记录时，让 AI 渲染一张可视化图：单条决策的思辨过程渲染成卡片树（adrkit tree），全部决策渲染成决策地图（adrkit graph --html），任意视图都能一键存成图片。',
    'faq.3.q': 'ADR Kit 能与 OpenSpec 这类工具同时使用吗？',
    'faq.3.a':
      '可以，它们回答的是不同的问题。OpenSpec 这类规约驱动工具跟踪"在构建什么、如何变更"；ADR Kit 记录"为什么选这个技术方向、放弃了什么"。很多团队两者并用：OpenSpec 管理变更过程，其中的关键抉择落成 ADR。两者分处不同目录，互不冲突。',

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
