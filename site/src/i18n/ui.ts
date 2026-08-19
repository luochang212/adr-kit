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
      'ADR Kit turns architecture decisions into plain Markdown files with a machine-checkable lifecycle: proposed → accepted / rejected / superseded. Built for humans and AI agents.',

    'nav.docs': 'Docs',
    'nav.faq': 'FAQ',
    'nav.github': 'GitHub',

    'hero.tagline': 'Architecture Decision Records for AI coding assistants',
    'hero.lead':
      'ADR Kit turns architecture decisions into plain Markdown files with a machine-checkable lifecycle. Every record must say what problem it solves, what it chose, and what it gave up.',
    'hero.install': 'npm install -g adr-kit',
    'hero.copied': 'Copied',
    'hero.copy': 'Copy',

    'lifecycle.eyebrow': 'Lifecycle',
    'lifecycle.title': 'One decision, one file, one state machine',
    'lifecycle.lead':
      'Records live in plain folders. The CLI stamps the date at every move and refuses invalid transitions.',
    'lifecycle.proposed': 'Drafts waiting for a decision. Expected to fail validation until every required section is filled in.',
    'lifecycle.accepted': 'Validated, numbered, and moved to decisions/. The record becomes the team\u2019s source of truth.',
    'lifecycle.rejected': 'Declined with a recorded reason, frozen as history. Never edited afterwards.',
    'lifecycle.superseded': 'Replaced by a newer decision. Stays in decisions/ as history, linked to its successor.',

    'features.eyebrow': 'Why ADR Kit',
    'features.title': 'The record format is the product',
    'features.1.title': 'Plain Markdown',
    'features.1.body': 'Records are readable text first. The parser and validator are the format contract.',
    'features.2.title': 'Machine-checkable lifecycle',
    'features.2.body': 'adrkit validate fails fresh drafts until the required sections exist. Validation failures are success signals: they tell humans and agents exactly what is missing.',
    'features.3.title': 'Agent-native',
    'features.3.body': 'adrkit init --tools installs skills and slash commands for your AI coding assistant, so agents propose, validate, and accept decisions the same way humans do.',
    'features.4.title': 'Numbered only when accepted',
    'features.4.body': 'Proposals carry dates, not numbers. A decision earns its N when it is accepted — the sequence always means "decisions we actually made".',

    'integrations.eyebrow': 'Integrations',
    'integrations.title': 'Works with your AI coding assistant',
    'integrations.lead':
      'One flag writes agent skills and slash commands into your project. The same workflows, mirrored for every supported tool.',
    'integrations.generic': 'Any AGENTS-compatible agent',

    'install.eyebrow': 'Install',
    'install.title': 'Up and running in a minute',
    'install.node': 'Requires Node.js 20.19 or later.',
    'install.step1': 'Install the CLI',
    'install.step2': 'Initialize your project',
    'install.step3': 'Record your first decision',
    'install.github': 'Star on GitHub',
    'install.githubBody': 'Source, issues, and the full documentation live on GitHub.',

    'faq.eyebrow': 'FAQ',
    'faq.title': 'Questions',
    'faq.1.q': 'What does ADR Kit do to my project when I adopt it?',
    'faq.1.a':
      'It adds one adr/ directory — a config file, a README with the conventions, and three folders (proposed/, decisions/, rejected/). Optionally, adrkit init --tools also writes skill files for your AI assistant (for example .claude/skills/). That is all: records are plain Markdown, there is no runtime dependency, no service, and no lock-in — delete the directory and everything is gone.',
    'faq.2.q': 'How do I use ADR Kit day to day?',
    'faq.2.a':
      'Run adrkit propose "<title>" when a decision comes up, fill in the required sections (Problem, Proposal, Alternatives considered, Acceptance criteria, Risks), and run adrkit validate until it passes. Then adrkit accept "<title>" numbers the decision and files it under decisions/. AI coding assistants can drive the same workflow through the installed skills — you review, they type.',
    'faq.3.q': 'Can I use ADR Kit alongside tools like OpenSpec?',
    'faq.3.a':
      'Yes — they answer different questions. Spec-driven tools like OpenSpec track what you are building and how it changes; ADR Kit records why a technical direction was chosen and what was given up. Many teams run both: OpenSpec manages the change, and the pivotal choices inside it become ADRs. They live in separate directories and never conflict.',

    'footer.tagline': 'Architecture Decision Records for AI coding assistants',
    'footer.docs': 'Documentation',
    'footer.license': 'MIT License',
  },
  zh: {
    'meta.title': 'ADR Kit — 为 AI 编码助手而生的架构决策记录',
    'meta.description':
      'ADR Kit 把架构决策变成纯 Markdown 文件，并带有机检的生命周期：proposed → accepted / rejected / superseded。人和 AI Agent 都能用。',

    'nav.docs': '文档',
    'nav.faq': '常见问题',
    'nav.github': 'GitHub',

    'hero.tagline': '为 AI 编码助手而生的架构决策记录（ADR）',
    'hero.lead':
      'ADR Kit 把架构决策变成纯 Markdown 文件，并带有机检的生命周期。每条记录都必须说清：解决了什么问题、选择了什么、放弃了什么。',
    'hero.install': 'npm install -g adr-kit',
    'hero.copied': '已复制',
    'hero.copy': '复制',

    'lifecycle.eyebrow': '生命周期',
    'lifecycle.title': '一个决策，一个文件，一台状态机',
    'lifecycle.lead': '记录存放在普通文件夹里。CLI 在每次状态迁移时盖日期戳，并拒绝非法流转。',
    'lifecycle.proposed': '等待决策的草案。在所有必填章节填满之前，校验理应失败。',
    'lifecycle.accepted': '通过校验、获得编号、移入 decisions/。记录从此成为团队的事实来源。',
    'lifecycle.rejected': '带着记录的否决理由封存在 rejected/，成为历史，永不再编辑。',
    'lifecycle.superseded': '被更新的决策取代。作为历史留在 decisions/，并链接到继任者。',

    'features.eyebrow': '为什么是 ADR Kit',
    'features.title': '记录格式即产品',
    'features.1.title': '纯 Markdown',
    'features.1.body': '记录首先是可读的文本。解析器和校验器就是格式契约。',
    'features.2.title': '机检生命周期',
    'features.2.body': 'adrkit validate 会让缺少必填章节的草案失败。校验失败是成功信号：它精确告诉人和 Agent 缺了什么。',
    'features.3.title': 'Agent 原生',
    'features.3.body': 'adrkit init --tools 为你的 AI 编码助手安装技能和斜杠命令，Agent 与人用同一套流程提案、校验、批准决策。',
    'features.4.title': '批准才编号',
    'features.4.body': '提案只有日期，没有编号。决策被批准的那一刻才获得 N——编号序列永远只代表"真正做过的决策"。',

    'integrations.eyebrow': '集成',
    'integrations.title': '与你的 AI 编码助手协同工作',
    'integrations.lead': '一个参数即可把 Agent 技能和斜杠命令写入项目。同一套工作流，镜像到每个支持的工具。',
    'integrations.generic': '任何兼容 AGENTS 的 Agent',

    'install.eyebrow': '安装',
    'install.title': '一分钟跑起来',
    'install.node': '需要 Node.js 20.19 或更高版本。',
    'install.step1': '安装 CLI',
    'install.step2': '初始化项目',
    'install.step3': '记录第一个决策',
    'install.github': '在 GitHub 上 Star',
    'install.githubBody': '源码、Issue 和完整文档都在 GitHub。',

    'faq.eyebrow': '常见问题',
    'faq.title': 'Q&A',
    'faq.1.q': '引入 ADR Kit 后，它会在我的项目里做什么？',
    'faq.1.a':
      '只添加一个 adr/ 目录——一个配置文件、一份写明约定的 README、三个文件夹（proposed/、decisions/、rejected/）。如果执行 adrkit init --tools，还会为你的 AI 助手写入技能文件（例如 .claude/skills/）。仅此而已：记录是纯 Markdown，没有运行时依赖、没有服务、没有锁定——删掉目录就什么都不剩。',
    'faq.2.q': '日常如何在项目中使用 ADR Kit？',
    'faq.2.a':
      '决策出现时运行 adrkit propose "<标题>"，填满必填章节（问题、方案、备选、验收标准、风险），反复运行 adrkit validate 直到通过。然后 adrkit accept "<标题>" 为决策编号并归档到 decisions/。AI 编码助手可以通过安装的技能驱动同一流程——它动手，你审阅。',
    'faq.3.q': 'ADR Kit 能与 OpenSpec 这类工具同时使用吗？',
    'faq.3.a':
      '可以——它们回答的是不同的问题。OpenSpec 这类规约驱动工具跟踪"在构建什么、如何变更"；ADR Kit 记录"为什么选这个技术方向、放弃了什么"。很多团队两者并用：OpenSpec 管理变更过程，其中的关键抉择落成 ADR。两者分处不同目录，互不冲突。',

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
