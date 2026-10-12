import { DIRECTIONS, fair, MAJOR_ALL, runMatch, type Criteria, type Degree, type MatchInfo } from "./matching";

export type ResumeProfile = {
  major: string | null;
  majors: string[];
  degree: Degree | null;
  salaryFloor: number | null;
  skills: string[];
  intents: string[];
};

/* 技能词表：面向本场招聘会岗位（机械/电气/软件/财务/农食/设计/外贸等） */
const SKILL_KEYWORDS = [
  "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "C语言", "Go", "Kotlin", "PHP", "SQL", "MySQL", "Redis", "MongoDB",
  "Linux", "Git", "Docker", "Nginx", "HTML", "CSS", "React", "Vue", "Node.js", "jQuery", "Spring", "Spring Boot", "SpringBoot",
  "MyBatis", "Django", "Flask", "小程序", "微信小程序", "爬虫", "数据分析", "数据可视化", "机器学习", "深度学习", "算法",
  "数据结构", "Pandas", "NumPy", "OpenCV", "PyTorch", "TensorFlow", "ECharts", "Tableau", "SPSS", "R语言",
  "嵌入式", "单片机", "STM32", "PLC", "PCB", "电路", "自动化", "电气", "电机", "Verilog", "FPGA", "DSP", "Keil",
  "Altium Designer", "Multisim", "Proteus", "信号处理", "三菱", "西门子", "伺服", "运动控制", "机器视觉", "组态",
  "CAD", "AutoCAD", "SolidWorks", "UG", "CATIA", "Creo", "Inventor", "CAXA", "ANSYS", "MATLAB", "LabVIEW",
  "机械设计", "结构设计", "液压", "数控", "焊接", "仿真", "钣金", "注塑", "有限元",
  "广联达", "Revit", "BIM", "PKPM", "测绘",
  "会计", "审计", "税务", "出纳", "会计证书", "初级会计", "CPA", "ACCA", "基金", "证券", "银行", "保险",
  "ERP", "SAP", "用友", "金蝶", "财务报表", "报税", "证券从业", "基金从业", "银行从业", "期货从业",
  "英语四级", "英语六级", "大学英语四级", "大学英语六级", "CET-4", "CET-6", "专业四级", "专业八级", "雅思", "托福",
  "日语", "N2", "N1", "商务英语", "普通话", "教师资格证", "计算机二级", "计算机三级", "软考",
  "Photoshop", "PS", "Illustrator", "Premiere", "PR", "AE", "剪映", "Final Cut", "C4D", "Blender", "Axure", "墨刀", "Xmind", "Visio",
  "视频剪辑", "视频拍摄", "摄影", "排版", "UI设计", "平面设计", "3D建模", "AIGC", "Midjourney", "Stable Diffusion",
  "公众号", "小红书", "抖音",
  "食品检验", "质检", "化验", "HACCP", "HPLC", "PCR", "细胞培养", "微生物", "有机合成", "感官评价",
  "种植", "育种", "植保", "园林", "林业", "茶艺", "评茶",
  "Excel", "Word", "PPT", "Office", "WPS", "文案", "新媒体", "电商", "直播", "报关", "外贸", "单证", "物流",
  "供应链", "采购", "人力资源", "招聘", "销售",
];

function detectSkills(text: string): string[] {
  const found: string[] = [];
  for (const kw of SKILL_KEYWORDS) {
    if (/^[a-zA-Z0-9+#. ]+$/.test(kw)) {
      const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^a-zA-Z0-9])${esc}([^a-zA-Z0-9]|$)`, "i");
      if (re.test(text)) found.push(kw);
    } else if (text.includes(kw)) {
      found.push(kw);
    }
  }
  // 去重：被其他已命中词包含的短词移除（如「英语四级」⊂「大学英语四级」、「PR」⊂「Premiere」），
  // 避免同一技能被重复计数
  const lower = found.map((k) => k.toLowerCase());
  return found
    .filter((k, i) => !lower.some((o, j) => j !== i && o.length > lower[i]!.length && o.includes(lower[i]!)))
    .slice(0, 14);
}

function detectMajors(text: string): string[] {
  const hits = MAJOR_ALL.map((m) => m.name).filter((name) => name.length >= 2 && text.includes(name));
  hits.sort((a, b) => b.length - a.length);
  return hits.slice(0, 5);
}

function detectDegree(text: string): Degree | null {
  if (/博士|硕士|研究生/.test(text)) return "硕士";
  if (/本科|学士/.test(text)) return "本科";
  return null;
}

function detectSalaryFloor(text: string): number | null {
  const lines = text.split(/[\n。；;]/).filter((l) => /期望|希望|薪资|薪酬|待遇|意向|要求/.test(l));
  const nums: number[] = [];
  for (const line of lines) {
    for (const m of line.matchAll(/(\d+(?:\.\d+)?)\s*[kK](?![a-zA-Z])/g)) nums.push(Math.round(parseFloat(m[1]) * 1000));
    for (const m of line.matchAll(/(\d{4,5})(?![0-9])/g)) nums.push(parseInt(m[1], 10));
  }
  // 排除年份（1990-2035）与明显不合理的数值
  const valid = nums.filter((n) => n >= 3000 && n <= 60000 && !(n >= 1990 && n <= 2035));
  return valid.length > 0 ? Math.min(...valid) : null;
}

const INTENT_LABEL_RE = /(求职意向|意向岗位|期望岗位|期望职位|目标岗位|意向职位|求职岗位|期望方向|求职方向)[：: ]*([^\n。；;！？]{1,24})/g;
/* 片段以这些词开头时判定为「句子」而非「意向短语」，不参与方向匹配 */
const SENTENCE_START_RE = /^(有|熟悉|掌握|了解|参与|负责|具备|曾|获|包括|以及|熟练|担任|完成|通过|参加|独立|协助|主要)/;
/* 简历头部（前几行）中带岗位后缀的行视为求职意向，如「销售工程师」「解决方案工程师（AI 落地）」 */
const HEADLINE_JOB_RE = /(工程师|经理|专员|顾问|设计师|分析师|助理|主管|代表|销售|售前|运营)/;

export function detectJobIntents(text: string, skills: string[]): string[] {
  // 收集候选片段：显式意向标签 + 头部岗位行
  const segments: string[] = [];
  for (const m of text.matchAll(INTENT_LABEL_RE)) {
    const seg = (m[2] ?? "").trim();
    if (seg) segments.push(seg);
  }
  const headLines = text.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);
  for (const line of headLines) {
    if (line.length <= 26 && HEADLINE_JOB_RE.test(line)) segments.push(line);
  }

  // 短语级匹配（按 、，/ 等切分，跳过句子片段，按命中词数打分取前 3）
  const scores = new Map<string, number>();
  let explicitHit = false;
  for (const seg of segments) {
    const frags = seg.split(/[，,、;；/|·]+/).map((f) => f.trim()).filter(Boolean).slice(0, 3);
    for (const frag of frags) {
      if (SENTENCE_START_RE.test(frag)) continue;
      for (const d of DIRECTIONS) {
        const terms = new Set([...d.label.split("／"), ...d.keywords]);
        let hits = 0;
        for (const t of terms) {
          if (t.length >= 2 && frag.includes(t)) hits += 1;
        }
        if (hits > 0) {
          scores.set(d.id, (scores.get(d.id) ?? 0) + hits);
          explicitHit = true;
        }
      }
    }
  }
  if (explicitHit) {
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }
  // 2) 无显式意向时按技能推断：同一方向需 ≥2 项技能佐证，避免「英语四级 → 外贸」这类误判
  const counts = new Map<string, number>();
  for (const s of skills) {
    for (const d of DIRECTIONS) {
      if (d.skills.includes(s)) counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

export function analyzeResume(text: string): ResumeProfile {
  const majors = detectMajors(text);
  const skills = detectSkills(text);
  return {
    major: majors[0] ?? null,
    majors,
    degree: detectDegree(text),
    salaryFloor: detectSalaryFloor(text),
    skills,
    intents: detectJobIntents(text, skills),
  };
}

export function resumeToCriteria(profile: ResumeProfile): Criteria {
  return {
    major: profile.major ?? "",
    degree: profile.degree ?? "本科",
    skills: profile.skills,
    jobIntent: profile.intents,
    salaryFloor: profile.salaryFloor,
    regions: [],
    industries: [],
    sizes: [],
    tags: [],
    keyword: "",
  };
}

export type AdviceNote = { tone: "info" | "warn" | "good"; text: string };

export type Advice = {
  notes: AdviceNote[];
  recommendations: MatchInfo[];
  route: string[];
};

const SKILL_POSITION_HINTS = ["工程师", "开发", "专员", "助理", "管培", "设计师", "会计", "销售", "运营", "技术员"];

export function buildAdvice(profile: ResumeProfile, criteria: Criteria): Advice {
  const matches = runMatch(criteria, "match");
  const good = matches.filter((m) => m.major.level === "exact" || m.major.level === "close");
  const related = matches.filter((m) => m.major.level === "related");
  const open = matches.filter((m) => m.major.level === "open");

  const notes: AdviceNote[] = [];

  if (profile.major) {
    if (good.length > 0) {
      notes.push({ tone: "good", text: `专业对口单位 ${good.length} 家（相关 ${related.length} 家、不限专业 ${open.length} 家），建议优先走访对口单位。` });
    } else if (related.length > 0) {
      notes.push({ tone: "warn", text: `没有找到完全对口的单位，但有 ${related.length} 家与你专业方向相关，值得现场沟通。` });
    } else if (open.length > 0) {
      notes.push({ tone: "warn", text: `专业直接对口的单位较少，建议优先看 ${open.length} 家标注「不限专业」的单位。` });
    } else {
      notes.push({ tone: "warn", text: "这份数据里没有直接对口的单位，可以到现场多和一线的招聘人员聊聊，或考虑放宽地区、行业限制。" });
    }
  }

  if (criteria.salaryFloor !== null) {
    const full = matches.filter((m) => m.salary === "full");
    const floor = criteria.salaryFloor;
    const lower = Math.max(3000, floor - 1000);
    const relaxed = runMatch({ ...criteria, salaryFloor: lower }, "match").filter((m) => m.salary === "full");
    if (full.length > 0) {
      notes.push({ tone: "good", text: `多数岗位薪资达到你期望（≥${floor}）的单位有 ${full.length} 家。` });
    } else {
      notes.push({ tone: "warn", text: `暂无单位多数岗位达到 ${floor} 元；若期望降到 ${lower} 元，可达 ${relaxed.length} 家。` });
    }
  }

  const skillNotes: string[] = [];
  for (const skill of profile.skills.slice(0, 6)) {
    const hit = fair.companies.some((c) => c.positions.some((p) => p.title.toLowerCase().includes(skill.toLowerCase())));
    if (hit && !SKILL_POSITION_HINTS.some((h) => skill.includes(h))) skillNotes.push(skill);
  }
  if (skillNotes.length > 0) {
    const examples: string[] = [];
    for (const skill of skillNotes.slice(0, 3)) {
      // 例证优先挑正常岗位名（跳过「…招聘启事」这类来源数据中的告示类标题）
      const titles = fair.companies.flatMap((c) => c.positions).map((p) => p.title);
      const pos = titles.find((t) => t.toLowerCase().includes(skill.toLowerCase()) && !/(启事|公告|简章|通知|招聘会)/.test(t)) ??
        titles.find((t) => t.toLowerCase().includes(skill.toLowerCase()));
      if (pos) examples.push(`${skill}（如「${pos}」）`);
    }
    notes.push({ tone: "info", text: `你简历中的技能出现在岗位名称里：${examples.join("、")}，可在沟通时主动提及。` });
  }

  const recommendations = matches.filter((m) => m.score > 0).slice(0, 6);
  const route = [...recommendations]
    .sort((a, b) => (parseInt(a.company.booths[0] ?? "9999", 10) || 9999) - (parseInt(b.company.booths[0] ?? "9999", 10) || 9999))
    .map((m) => m.company.booths[0])
    .filter((b): b is string => Boolean(b));
  if (route.length >= 3) {
    notes.push({ tone: "info", text: `建议动线（按展位号）：${route.join(" → ")}` });
  }

  return { notes, recommendations, route };
}
