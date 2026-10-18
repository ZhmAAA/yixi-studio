export type ContentType = "hot" | "classic";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  evidenceLevel: "一手" | "权威二手" | "普通二手" | "待核";
};

export type Topic = {
  id: string;
  slug: string;
  type: ContentType;
  title: string;
  summary: string;
  background: string;
  tags: string[];
  asOfDate: string;
  expiresAt?: string;
  tensionPoints: string[];
  recommendedPersonIds: string[];
  sourceIds: string[];
  episodeCount: number;
};

export type Person = {
  id: string;
  slug: string;
  type: ContentType;
  displayName: string;
  shortName: string;
  role: string;
  era: string;
  bio: string;
  viewpointSummary: string;
  keywords: string[];
  suitableQuestionIds: string[];
  sourceIds: string[];
};

export type Turn = {
  sequence: number;
  speakerId: string;
  text: string;
  provenance: "观点摘要" | "事实背景" | "合成演绎";
  citationIds: string[];
};

export type Episode = {
  id: string;
  title: string;
  question: string;
  topicId: string;
  personIds: string[];
  format: "观点对谈";
  duration: string;
  combinationType: string;
  disclosure: string;
  turns: Turn[];
};

export const sources: Source[] = [
  {
    id: "source-fei-fei",
    title: "Fei-Fei Li profile",
    publisher: "Stanford HAI",
    url: "https://hai.stanford.edu/people/fei-fei-li",
    evidenceLevel: "一手"
  },
  {
    id: "source-arendt",
    title: "Hannah Arendt",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/biography/Hannah-Arendt",
    evidenceLevel: "权威二手"
  },
  {
    id: "source-mcluhan",
    title: "Marshall McLuhan",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/biography/Marshall-McLuhan",
    evidenceLevel: "权威二手"
  },
  {
    id: "source-ai-work-demo",
    title: "AI 与知识工作的编辑资料包（演示占位）",
    publisher: "一席话编辑部",
    url: "https://github.com/ZhmAAA/yixi-studio",
    evidenceLevel: "待核"
  }
];

export const topics: Topic[] = [
  {
    id: "topic-ai-work",
    slug: "ai-work-and-judgment",
    type: "hot",
    title: "当 AI 进入工作，我们该先追求效率，还是先保护人的判断力？",
    summary: "一场关于工具、判断和人的工作边界的当下讨论。",
    background: "生成式 AI 正在进入写作、研究、设计和决策流程。真正需要讨论的，已经不只是能不能用，而是哪些判断仍然应该由人承担。",
    tags: ["科技", "工作", "判断力"],
    asOfDate: "2026-10-18",
    expiresAt: "2026-11-18",
    tensionPoints: ["效率提升是否会换来判断力退化？", "工具的普及会扩大还是缩小人的自由？"],
    recommendedPersonIds: ["person-fei-fei", "person-arendt"],
    sourceIds: ["source-fei-fei", "source-ai-work-demo"],
    episodeCount: 3
  },
  {
    id: "topic-technology-freedom",
    slug: "technology-and-freedom",
    type: "classic",
    title: "技术让人更自由，还是让人更依赖？",
    summary: "一个持续反复出现的问题：工具究竟扩展了我们，还是重新塑造了我们？",
    background: "从印刷术、广播到互联网，每种新媒介都改变了人们理解世界、组织关系和分配注意力的方式。",
    tags: ["文化", "社会", "媒介"],
    asOfDate: "长期问题",
    tensionPoints: ["我们使用工具，还是工具也在使用我们？", "便利是否会让人放弃主动选择？"],
    recommendedPersonIds: ["person-mcluhan", "person-arendt"],
    sourceIds: ["source-mcluhan", "source-arendt"],
    episodeCount: 7
  }
];

export const people: Person[] = [
  {
    id: "person-fei-fei",
    slug: "fei-fei-li",
    type: "hot",
    displayName: "李飞飞",
    shortName: "李",
    role: "人工智能研究者",
    era: "当代",
    bio: "以计算机视觉、人工智能研究与以人为本的技术讨论为主要公共身份。",
    viewpointSummary: "适合从技术发展、研究实践与人的主体性之间的关系切入。",
    keywords: ["AI", "以人为本", "研究"],
    suitableQuestionIds: ["topic-ai-work"],
    sourceIds: ["source-fei-fei"],
  },
  {
    id: "person-arendt",
    slug: "hannah-arendt",
    type: "classic",
    displayName: "汉娜·阿伦特",
    shortName: "阿",
    role: "政治思想家",
    era: "20 世纪",
    bio: "围绕人的行动、公共生活、劳动与思考留下了持续影响的思想资源。",
    viewpointSummary: "适合追问：当工具替我们行动时，人是否仍保有判断和行动的空间。",
    keywords: ["行动", "公共生活", "判断"],
    suitableQuestionIds: ["topic-ai-work", "topic-technology-freedom"],
    sourceIds: ["source-arendt"],
  },
  {
    id: "person-mcluhan",
    slug: "marshall-mcluhan",
    type: "classic",
    displayName: "马歇尔·麦克卢汉",
    shortName: "麦",
    role: "媒介理论家",
    era: "20 世纪",
    bio: "以媒介如何改变感知、关系与社会结构的分析而广为人知。",
    viewpointSummary: "适合把讨论从工具功能推向媒介环境：我们被什么样的形式重新组织？",
    keywords: ["媒介", "感知", "环境"],
    suitableQuestionIds: ["topic-technology-freedom"],
    sourceIds: ["source-mcluhan"],
  },
  {
    id: "person-satya",
    slug: "satya-nadella",
    type: "hot",
    displayName: "萨提亚·纳德拉",
    shortName: "纳",
    role: "科技企业管理者",
    era: "当代",
    bio: "适合代表大型组织在 AI 时代面对效率、组织与责任时的管理视角。",
    viewpointSummary: "适合把抽象问题落到产品、组织和大规模协作的现实选择。",
    keywords: ["组织", "产品", "责任"],
    suitableQuestionIds: ["topic-ai-work"],
    sourceIds: ["source-ai-work-demo"],
  }
];

export const episodes: Episode[] = [
  {
    id: "ai-work-judgment",
    title: "效率之后，谁来负责判断？",
    question: "当 AI 进入工作，我们该先追求效率，还是先保护人的判断力？",
    topicId: "topic-ai-work",
    personIds: ["person-fei-fei", "person-arendt"],
    format: "观点对谈",
    duration: "约 4 分钟",
    combinationType: "热点问题 × 经典人物",
    disclosure: "本内容基于公开资料的 AI 演绎，非本人发言，不代表本人观点。",
    turns: [
      {
        sequence: 1,
        speakerId: "person-fei-fei",
        text: "如果把 AI 只看成替人完成任务的机器，我们会错过更重要的事情：它正在改变人如何提出问题、验证答案和分配注意力。",
        provenance: "观点摘要",
        citationIds: ["source-fei-fei"]
      },
      {
        sequence: 2,
        speakerId: "person-arendt",
        text: "效率当然有价值，但效率回答的是“更快地做什么”。判断则要先回答“什么值得做”。这两件事不能混在一起。",
        provenance: "合成演绎",
        citationIds: ["source-arendt"]
      },
      {
        sequence: 3,
        speakerId: "person-fei-fei",
        text: "所以我更愿意把 AI 放在人的判断旁边，而不是放在判断之前。它可以扩大探索的范围，但最终的责任仍然需要被看见。",
        provenance: "合成演绎",
        citationIds: ["source-fei-fei", "source-ai-work-demo"]
      },
      {
        sequence: 4,
        speakerId: "person-arendt",
        text: "当一个社会把所有选择都交给最有效率的系统，它可能仍然很忙，却不再知道自己正在共同创造什么。",
        provenance: "合成演绎",
        citationIds: ["source-arendt"]
      }
    ]
  }
];

export function getTopic(slug: string) {
  return topics.find((topic) => topic.slug === slug);
}

export function getPerson(slug: string) {
  return people.find((person) => person.slug === slug);
}

export function getEpisode(id: string) {
  return episodes.find((episode) => episode.id === id);
}

export function getPeopleByIds(ids: string[]) {
  return ids.map((id) => people.find((person) => person.id === id)).filter(Boolean) as Person[];
}

export function getSourcesByIds(ids: string[]) {
  return ids.map((id) => sources.find((source) => source.id === id)).filter(Boolean) as Source[];
}
