import fairJson from "@/data/fair.json";

export type MajorItem = { degree: string; name: string };
export type Position = { title: string; salaryMin: number | null; salaryMax: number | null };
export type Company = {
  id: number;
  name: string;
  booths: string[];
  creditCode: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  nature: string;
  industry: string;
  size: string;
  capital: number | null;
  location: string;
  city: string;
  region: string;
  headcount: number | null;
  positions: Position[];
  majors: MajorItem[];
  noLimit: boolean;
  tags: string[];
  intro: string;
};
export type FairMeta = {
  sourceFile: string;
  generatedAt: string;
  approvedRows: number;
  mergedCompanies: number;
  skippedRows: number;
  totalCompanies: number;
  totalPositions: number;
  totalHeadcount: number;
  regions: Record<string, string>;
  majorOptions: { name: string; degrees: string[]; count: number }[];
};
export type FairData = { meta: FairMeta; companies: Company[] };

export const fair = fairJson as FairData;

export const REGION_ORDER = ["linan", "hangzhou", "zhejiang", "outside", "unknown"];

export type Degree = "本科" | "硕士" | "不限";

export const SALARY_STEPS = [3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];

export type Criteria = {
  major: string;
  degree: Degree;
  skills: string[];
  jobIntent: string[];
  salaryFloor: number | null;
  regions: string[];
  industries: string[];
  sizes: string[];
  tags: string[];
  keyword: string;
};

export const emptyCriteria: Criteria = {
  major: "",
  degree: "本科",
  skills: [],
  jobIntent: [],
  salaryFloor: null,
  regions: [],
  industries: [],
  sizes: [],
  tags: [],
  keyword: "",
};

export function hasCriteria(c: Criteria): boolean {
  return Boolean(
    c.major.trim() ||
      c.skills.length ||
      c.jobIntent.length ||
      c.salaryFloor ||
      c.regions.length ||
      c.industries.length ||
      c.sizes.length ||
      c.tags.length ||
      c.keyword.trim(),
  );
}

const SIZE_ORDER = ["少于50人", "50-150人", "150-500人", "500-1000人", "1000-5000人", "5000-10000人", "10000人以上"];
const TAG_ORDER = ["校友企业", "上市公司", "世界500强", "中国500强", "民企500强"];

function tally(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

const industryTally = tally(fair.companies.map((c) => c.industry));
export const INDUSTRY_OPTIONS = [...industryTally.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
  .map(([name, count]) => ({ name, count }));

const sizeTally = tally(fair.companies.map((c) => c.size));
export const SIZE_OPTIONS = [...sizeTally.entries()]
  .sort((a, b) => SIZE_ORDER.indexOf(a[0]) - SIZE_ORDER.indexOf(b[0]))
  .map(([name, count]) => ({ name, count }));

const tagTally = tally(fair.companies.flatMap((c) => c.tags));
export const TAG_OPTIONS = TAG_ORDER.filter((t) => tagTally.has(t)).map((name) => ({ name, count: tagTally.get(name) ?? 0 }));

export const REGION_OPTIONS = REGION_ORDER.filter((r) => (fair.meta.regions[r] ?? "") && fair.companies.some((c) => c.region === r)).map(
  (key) => ({ key, label: fair.meta.regions[key], count: fair.companies.filter((c) => c.region === key).length }),
);

export const MAJOR_HOT = fair.meta.majorOptions.slice(0, 10);
export const MAJOR_ALL = fair.meta.majorOptions;

const PAREN_RE = /[（(][^（）()]*[）)]/g;
export function normMajor(s: string): string {
  return s.replace(PAREN_RE, "").replace(/[\s·・]/g, "").toLowerCase();
}

/* 专业大类别名：用于「财会类」「药学相关专业」这类笼统表述的相近匹配 */
const ALIAS_GROUPS: string[][] = [
  ["会计", "财务", "审计", "财会", "财管", "财务管理", "会计学"],
  ["金融", "经济", "投资", "保险", "财政", "税收", "经济学"],
  ["贸易", "国际经济与贸易", "国际经贸", "商务", "外贸", "经贸"],
  ["市场营销", "营销", "市场", "销售"],
  ["电子商务", "电商"],
  ["工商管理", "管理", "人力资源", "人力", "行政", "工商", "公共管理"],
  ["物流", "供应链", "采购", "运输", "物流管理"],
  ["英语", "外语", "商务英语", "翻译", "语言", "日语"],
  ["计算机", "软件", "网络", "物联网", "信息安全", "计算机科学与技术", "软件工程"],
  ["信息", "电子信息", "通信", "电子", "微电子", "集成电路", "信息工程"],
  ["数据", "大数据", "统计", "数学", "人工智能", "智能科学与技术", "数据科学"],
  ["自动化", "控制", "机电", "机械", "装备", "车辆", "机器人", "机械设计制造及其自动化"],
  ["电气", "电机", "电力", "能源", "动力", "新能源"],
  ["食品", "粮食", "营养", "食品质量与安全", "食品科学与工程"],
  ["生物", "生物技术", "生物工程", "生命", "生物科学", "生物制药"],
  ["化学", "化工", "应用化学", "材料", "高分子", "木材", "纺织", "制药工程"],
  ["农学", "农业", "农艺", "作物", "植保", "植物保护", "种子", "农药"],
  ["林学", "林业", "森林", "园林", "风景园林", "园艺", "风景"],
  ["环境", "生态", "资源", "环境工程", "农业资源与环境"],
  ["设计", "视觉传达", "环境设计", "产品设计", "工业设计", "数字媒体", "艺术", "美术"],
  ["法学", "法律", "知识产权"],
  ["新闻", "传播", "广告", "媒体", "中文", "汉语言", "广播电视", "编辑出版"],
  ["旅游", "酒店", "会展", "休闲"],
  ["土木", "建筑", "工程管理", "市政", "水利", "测绘", "工程造价"],
  ["茶学", "茶文化", "茶叶"],
  ["药学", "制药", "药物", "中药", "药剂"],
];
const ALIAS_MAP = new Map<string, string[]>();
for (const group of ALIAS_GROUPS) {
  for (const kw of group) {
    if (!ALIAS_MAP.has(kw)) ALIAS_MAP.set(kw, group);
  }
}

export type MajorLevel = "exact" | "close" | "related" | "open" | "none";

/* 维度满分：专业 42（基础 36 + 命中加成上限 6）/ 技能 15 / 行业 15 / 地区 10 / 薪资 25 */
const LEVEL_POINTS: Record<MajorLevel, number> = { exact: 36, close: 30, related: 24, open: 16, none: 0 };
const LEVEL_RANK: Record<MajorLevel, number> = { none: 0, open: 1, related: 2, close: 3, exact: 4 };

function degreeAllowed(itemDegree: string, student: Degree): boolean {
  if (!itemDegree || student === "不限") return true;
  if (student === "硕士") return true; // 硕士可投本科岗位
  return itemDegree === student;
}

function groupFor(root: string): string[] | undefined {
  const direct = ALIAS_MAP.get(root);
  if (direct) return direct;
  // 包含式兜底：如 "网络工程" 含 "网络" → 计算机组
  if (root.length >= 3) {
    for (const [k, g] of ALIAS_MAP) {
      if (k.length >= 2 && root.includes(k)) return g;
    }
  }
  return undefined;
}

function relatedByAlias(key: string, s: string): boolean {
  if (key.length < 2) return false;
  const roots = new Set<string>([key]);
  const stripped = key.replace(/(相关专业|等专业|专业|相关|等)+$/g, "").replace(/类$/g, "");
  if (stripped && stripped !== key) roots.add(stripped);
  for (const root of roots) {
    const group = groupFor(root);
    if (!group) continue;
    for (const kw of group) {
      if (kw.length >= 2 && (s.includes(kw) || kw.includes(s))) return true;
    }
  }
  return false;
}

export type MajorMatch = { level: MajorLevel; item?: string; hits: number };

export function majorMatch(company: Company, major: string, degree: Degree): MajorMatch {
  const s = normMajor(major);
  if (!s) return { level: "none", hits: 0 };
  let best: MajorLevel = "none";
  let bestItem: string | undefined;
  let hits = 0;
  for (const item of company.majors) {
    if (!degreeAllowed(item.degree, degree)) continue;
    let itemLevel: MajorLevel = "none";
    for (const key of item.name.split(/[/、或]/).map(normMajor).filter(Boolean)) {
      let level: MajorLevel = "none";
      if (key === s) level = "exact";
      else if ((s.length >= 3 && key.includes(s)) || (key.length >= 3 && s.includes(key))) level = "close";
      else if (relatedByAlias(key, s)) level = "related";
      if (LEVEL_RANK[level] > LEVEL_RANK[itemLevel]) itemLevel = level;
    }
    if (itemLevel !== "none") {
      hits += 1;
      if (LEVEL_RANK[itemLevel] > LEVEL_RANK[best]) {
        best = itemLevel;
        bestItem = item.name;
      }
    }
  }
  if (best === "none" && company.noLimit) return { level: "open", hits: 0 };
  return { level: best, item: bestItem, hits };
}

/* 岗位方向：求职者的期望岗位，以及技能可推导出的方向；keywords 用于匹配岗位标题 */
export type Direction = { id: string; label: string; keywords: string[]; skills: string[] };

export const DIRECTIONS: Direction[] = [
  {
    id: "tech",
    label: "技术／研发",
    keywords: ["开发", "研发", "工程师", "技术", "软件", "硬件", "算法", "嵌入式", "结构", "电气", "电子", "机械", "自动化", "工艺", "测试", "运维"],
    skills: ["Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "C语言", "Go", "Kotlin", "PHP", "SQL", "MySQL", "Redis", "MongoDB", "Linux", "Git", "Docker", "Nginx", "HTML", "CSS", "React", "Vue", "Node.js", "jQuery", "Spring", "Spring Boot", "SpringBoot", "MyBatis", "Django", "Flask", "小程序", "微信小程序", "爬虫", "算法", "机器学习", "深度学习", "数据结构", "Pandas", "NumPy", "OpenCV", "PyTorch", "TensorFlow", "ECharts", "嵌入式", "单片机", "STM32", "PLC", "PCB", "电路", "自动化", "电气", "电机", "Verilog", "FPGA", "DSP", "Keil", "Altium Designer", "Multisim", "Proteus", "信号处理", "三菱", "西门子", "伺服", "运动控制", "机器视觉", "组态", "CAD", "AutoCAD", "SolidWorks", "UG", "CATIA", "Creo", "Inventor", "CAXA", "ANSYS", "MATLAB", "LabVIEW", "机械设计", "结构设计", "液压", "数控", "焊接", "仿真", "钣金", "注塑", "有限元", "广联达", "Revit", "BIM", "PKPM", "测绘", "计算机二级", "计算机三级", "软考"],
  },
  { id: "data", label: "数据／分析", keywords: ["数据", "分析", "统计"], skills: ["数据分析", "数据可视化", "Excel", "统计", "建模", "Tableau", "SPSS", "R语言"] },
  { id: "product", label: "产品／运营", keywords: ["产品", "运营", "策划", "企划"], skills: ["电商", "直播", "文案", "新媒体"] },
  { id: "sales", label: "销售／市场", keywords: ["销售", "市场", "营销", "商务", "客户", "业务"], skills: ["销售", "电商", "直播"] },
  { id: "finance", label: "财务／职能", keywords: ["财务", "会计", "审计", "出纳", "资金", "税务", "人事", "人力", "行政", "法务"], skills: ["会计", "审计", "税务", "出纳", "会计证书", "初级会计", "CPA", "ACCA", "基金", "证券", "银行", "保险", "人力资源", "招聘", "ERP", "SAP", "用友", "金蝶", "财务报表", "报税", "证券从业", "基金从业", "银行从业", "期货从业"] },
  { id: "design", label: "设计／传媒", keywords: ["设计", "美工", "视觉", "UI", "视频", "剪辑", "新媒体", "文案", "编辑", "摄影"], skills: ["Photoshop", "PS", "Illustrator", "Premiere", "PR", "AE", "剪映", "Final Cut", "C4D", "Blender", "Axure", "墨刀", "Xmind", "Visio", "视频剪辑", "视频拍摄", "摄影", "排版", "UI设计", "平面设计", "3D建模", "AIGC", "Midjourney", "Stable Diffusion", "公众号", "小红书", "抖音"] },
  { id: "trade", label: "外贸／国际", keywords: ["外贸", "单证", "国际", "海外", "跨境", "翻译", "报关"], skills: ["英语四级", "英语六级", "大学英语四级", "大学英语六级", "CET-4", "CET-6", "专业四级", "专业八级", "雅思", "托福", "日语", "N2", "N1", "商务英语", "翻译", "报关", "单证"] },
  { id: "supply", label: "采购／物流", keywords: ["采购", "物流", "供应链", "仓储", "库存"], skills: ["采购", "物流", "供应链", "报关", "单证"] },
  { id: "quality", label: "生产／质量", keywords: ["生产", "品控", "质量", "品质", "qa", "qc", "检验", "化验", "车间", "数控"], skills: ["食品检验", "质检", "化验", "HACCP", "HPLC", "PCR", "细胞培养", "微生物", "有机合成", "感官评价"] },
  { id: "trainee", label: "管培生／储备", keywords: ["管培", "培训生", "储备", "储干"], skills: [] },
  { id: "edu", label: "教育／培训", keywords: ["教师", "老师", "教学", "讲师", "教研", "课程", "顾问", "咨询", "规划师", "学管"], skills: ["教师资格证", "普通话"] },
  { id: "agri", label: "农林技术", keywords: ["农技", "育种", "种植", "植保", "园林", "林业", "茶", "基地", "科研"], skills: ["种植", "育种", "植保", "园林", "林业", "茶艺", "评茶"] },
  { id: "pharma", label: "医药／生物", keywords: ["药品", "医药", "中药", "生物", "制药"], skills: [] },
];

export const DIRECTION_LABEL: Record<string, string> = Object.fromEntries(DIRECTIONS.map((d) => [d.id, d.label]));

function directionHit(titles: string[], d: Direction): boolean {
  return titles.some((t) => d.keywords.some((k) => t.includes(k.toLowerCase())));
}

export function matchDirections(company: Company, ids: string[]): string[] {
  if (ids.length === 0) return [];
  const titles = company.positions.map((p) => p.title.toLowerCase());
  return ids.filter((id) => {
    const d = DIRECTIONS.find((x) => x.id === id);
    return d ? directionHit(titles, d) : false;
  });
}

export function skillMatch(company: Company, skills: string[]): string[] {
  if (skills.length === 0) return [];
  const titles = company.positions.map((p) => p.title.toLowerCase());
  const found: string[] = [];
  for (const skill of skills) {
    const dirs = DIRECTIONS.filter((d) => d.skills.includes(skill));
    if (dirs.length === 0) continue;
    if (dirs.some((d) => directionHit(titles, d))) found.push(skill);
  }
  return found;
}

/* 期望岗位选项（含覆盖单位数，供筛选面板展示） */
const directionTally = (() => {
  const counts = new Map<string, number>();
  const titleCache = fair.companies.map((c) => c.positions.map((p) => p.title.toLowerCase()));
  for (const d of DIRECTIONS) {
    counts.set(d.id, titleCache.filter((titles) => directionHit(titles, d)).length);
  }
  return counts;
})();

export const DIRECTION_OPTIONS = DIRECTIONS.filter((d) => (directionTally.get(d.id) ?? 0) > 0).map((d) => ({
  id: d.id,
  label: d.label,
  count: directionTally.get(d.id) ?? 0,
}));

export type SortKey = "match" | "booth" | "salary" | "headcount";

export type MatchOptions = {
  favoriteNames?: Set<string>;
  favoritesOnly?: boolean;
};

export type Tone = "strong" | "mild" | "warn" | "info";

export type MatchInfo = {
  company: Company;
  score: number;
  possible: number;
  pct: number | null;
  major: MajorMatch;
  industryHit: boolean;
  regionHit: boolean;
  salary: "full" | "partial" | "none";
  salaryCoverage: number;
  skillHits: string[];
  intentHits: string[];
  bestMin: number;
  bestMax: number;
  reasons: { label: string; tone: Tone }[];
};

export function boothNumber(company: Company): number {
  const first = company.booths[0];
  return first && /^\d+$/.test(first) ? parseInt(first, 10) : 9999;
}

export function salaryRange(company: Company): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const p of company.positions) {
    if (p.salaryMin !== null) min = Math.min(min, p.salaryMin);
    if (p.salaryMax !== null) max = Math.max(max, p.salaryMax);
  }
  return max >= min ? { min, max } : null;
}

export function fmtSalary(min: number | null, max: number | null): string {
  if (min === null && max === null) return "薪资面议";
  if (min !== null && max !== null) return min === max ? `${min}` : `${min}-${max}`;
  return `${min ?? max}`;
}

export function fmtCapital(v: number | null): string {
  if (!v) return "";
  if (v >= 10000) {
    const yi = v / 10000;
    return `${Number.isInteger(yi) ? yi : yi.toFixed(1)} 亿元`;
  }
  return `${Number.isInteger(v) ? v : v.toFixed(1)} 万元`;
}

function salarySummary(company: Company) {
  let bestMin = -1;
  let bestMax = -1;
  for (const p of company.positions) {
    if (p.salaryMin !== null) bestMin = Math.max(bestMin, p.salaryMin);
    if (p.salaryMax !== null) bestMax = Math.max(bestMax, p.salaryMax);
  }
  return { bestMin: Math.max(bestMin, 0), bestMax: Math.max(bestMax, 0) };
}

function keywordHit(company: Company, keyword: string): boolean {
  const terms = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [
    company.name,
    company.industry,
    company.location,
    company.address,
    company.tags.join(" "),
    company.positions.map((p) => p.title).join(" "),
    company.majors.map((m) => m.name).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function runMatch(criteria: Criteria, sort: SortKey, options: MatchOptions = {}): MatchInfo[] {
  const wantsMajor = Boolean(criteria.major.trim());
  const hasIntent = criteria.jobIntent.length > 0;
  const hasSkills = criteria.skills.length > 0;
  const hasIndustries = criteria.industries.length > 0;
  const hasRegions = criteria.regions.length > 0;
  const hasSizes = criteria.sizes.length > 0;
  const hasTags = criteria.tags.length > 0;
  const hasSalary = criteria.salaryFloor !== null;
  const possible =
    (wantsMajor ? 42 : 0) +
    (hasIntent ? 15 : 0) +
    (hasSkills ? 15 : 0) +
    (hasIndustries ? 15 : 0) +
    (hasRegions ? 10 : 0) +
    (hasSalary ? 25 : 0);
  const favorites = options.favoriteNames;

  const results: MatchInfo[] = [];
  for (const company of fair.companies) {
    if (options.favoritesOnly && (!favorites || !favorites.has(company.name))) continue;
    if (hasIndustries && !criteria.industries.includes(company.industry)) continue;
    if (hasRegions && !criteria.regions.includes(company.region)) continue;
    if (hasSizes && !criteria.sizes.includes(company.size)) continue;
    if (hasTags && !company.tags.some((t) => criteria.tags.includes(t))) continue;
    if (!keywordHit(company, criteria.keyword)) continue;

    const major = wantsMajor ? majorMatch(company, criteria.major, criteria.degree) : { level: "none" as MajorLevel, hits: 0 };
    let score = LEVEL_POINTS[major.level];
    if (major.level === "exact" || major.level === "close" || major.level === "related") {
      score += Math.min(Math.max(major.hits - 1, 0), 3) * 2;
    }

    const intentHits = hasIntent ? matchDirections(company, criteria.jobIntent) : [];
    if (intentHits.length > 0) score += intentHits.length >= 2 ? 15 : 9;

    const skillHits = hasSkills ? skillMatch(company, criteria.skills) : [];
    if (skillHits.length > 0) score += Math.min(skillHits.length, 3) * 5;

    const industryHit = hasIndustries;
    if (industryHit) score += 15;
    const regionHit = hasRegions;
    if (regionHit) score += 10;

    const { bestMin, bestMax } = salarySummary(company);
    let salary: MatchInfo["salary"] = "none";
    let salaryCoverage = 0;
    if (hasSalary) {
      const floor = criteria.salaryFloor as number;
      let weighted = 0;
      let counted = 0;
      for (const p of company.positions) {
        if (p.salaryMin === null && p.salaryMax === null) continue;
        counted += 1;
        if ((p.salaryMin ?? 0) >= floor) weighted += 1;
        else if ((p.salaryMax ?? 0) >= floor) weighted += 0.6;
      }
      salaryCoverage = counted > 0 ? weighted / counted : 0;
      score += Math.round(25 * salaryCoverage);
      if (salaryCoverage >= 0.6) salary = "full";
      else if (salaryCoverage > 0) salary = "partial";
    }

    const reasons: { label: string; tone: Tone }[] = [];
    if (major.level === "exact" || major.level === "close") reasons.push({ label: "专业对口", tone: "strong" });
    else if (major.level === "related") reasons.push({ label: "专业相关", tone: "warn" });
    else if (major.level === "open") reasons.push({ label: "不限专业", tone: "info" });
    if (intentHits.length > 0) reasons.push({ label: "岗位方向匹配", tone: intentHits.length >= 2 ? "strong" : "warn" });
    if (skillHits.length > 0) reasons.push({ label: "技能匹配", tone: "mild" });
    if (industryHit) reasons.push({ label: "行业匹配", tone: "mild" });
    if (regionHit) reasons.push({ label: `地点匹配 · ${fair.meta.regions[company.region] ?? company.region}`, tone: "mild" });
    if (salary === "full") reasons.push({ label: "薪资达标", tone: "strong" });
    else if (salary === "partial") reasons.push({ label: "部分岗位达标", tone: "warn" });

    results.push({
      company,
      score,
      possible,
      pct: possible > 0 ? Math.round((score / possible) * 100) : null,
      major,
      industryHit,
      regionHit,
      salary,
      salaryCoverage,
      skillHits,
      intentHits,
      bestMin,
      bestMax,
      reasons,
    });
  }

  const byBooth = (a: MatchInfo, b: MatchInfo) => boothNumber(a.company) - boothNumber(b.company);
  results.sort((a, b) => {
    switch (sort) {
      case "booth":
        return byBooth(a, b);
      case "salary":
        return b.bestMax - a.bestMax || byBooth(a, b);
      case "headcount":
        return (b.company.headcount ?? 0) - (a.company.headcount ?? 0) || byBooth(a, b);
      case "match":
      default:
        // 有匹配条件时同分按单位标签数量再排；纯浏览（无条件）时保持展位顺序
        return b.score - a.score || (possible > 0 ? b.company.tags.length - a.company.tags.length : 0) || byBooth(a, b);
    }
  });
  return results;
}
