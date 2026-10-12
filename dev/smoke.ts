// 匹配算法烟测：用真实数据跑 runMatch / majorMatch 的关键路径
import { fair, emptyCriteria, hasCriteria, runMatch, majorMatch, boothNumber, type Criteria } from "../src/fair/matching";
import { analyzeResume, buildAdvice, resumeToCriteria } from "../src/fair/resume";
import { favoritesCsv, favoritesText, orderedFavorites } from "../src/fair/exportFavorites";
import chainData from "../data/chain.json";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (!cond) {
    failed += 1;
    console.log(`FAIL  ${name} ${detail}`);
  } else {
    console.log(`ok    ${name} ${detail}`);
  }
}

const cs: Criteria = { ...emptyCriteria, major: "计算机科学与技术", degree: "本科" };
const r1 = runMatch(cs, "match");
check("计算机科学与技术 有匹配结果", r1.length > 0, `count=${r1.length}`);
check("结果按分数降序", r1.every((r, i) => i === 0 || r1[i - 1]!.score >= r.score));
const exactCount = r1.filter((r) => r.major.level === "exact" || r.major.level === "close").length;
check("存在专业对口单位", exactCount > 0, `exact/close=${exactCount}`);
const pcts = r1.filter((r) => r.pct !== null);
check("分数百分比在 0-100", pcts.every((r) => r.pct! >= 0 && r.pct! <= 100));

// 无专业但薪资条件
const sal: Criteria = { ...emptyCriteria, salaryFloor: 8000 };
const r2 = runMatch(sal, "match");
check("薪资条件有结果", r2.length === fair.companies.length, `count=${r2.length}`);
check("薪资达标分>=部分达标", r2.findIndex((r) => r.salary === "full") <= r2.findIndex((r) => r.salary === "partial") || r2.every((r) => r.salary !== "partial"));
check("full 的公司最高薪资>=8000", r2.filter((r) => r.salary === "full").every((r) => r.bestMax >= 8000));

// 地区硬筛选
const linan: Criteria = { ...emptyCriteria, regions: ["linan"] };
const r3 = runMatch(linan, "match");
check("临安筛选", r3.length > 0 && r3.every((r) => r.company.region === "linan"), `count=${r3.length}`);

// 关键词搜索
const kw: Criteria = { ...emptyCriteria, keyword: "茶叶" };
const r4 = runMatch(kw, "match");
check("关键词搜索有结果", r4.length > 0, `count=${r4.length}`);

// 专业别名：会计学 → 财会类
const xinghe = fair.companies.find((c) => c.name === "浙江省兴合集团有限责任公司");
check("兴合集团存在", Boolean(xinghe));
if (xinghe) {
  const m = majorMatch(xinghe, "会计学", "本科");
  check("会计学 命中 财会类 → related", m.level === "related", `level=${m.level} item=${m.item}`);
}

// 不限专业兜底
const wenyin = fair.companies.find((c) => c.name === "杭州文津服饰有限公司");
if (wenyin) {
  const m = majorMatch(wenyin, "随便什么专业xyz", "本科");
  check("不限专业 → open", m.level === "open", `level=${m.level}`);
}

// 学历：硕士 >= 本科 命中数
const mUndergrad = runMatch({ ...emptyCriteria, major: "计算机科学与技术", degree: "本科" }, "match").filter((r) => r.score > 0).length;
const mGrad = runMatch({ ...emptyCriteria, major: "计算机科学与技术", degree: "硕士" }, "match").filter((r) => r.score > 0).length;
check("硕士命中数 >= 本科", mGrad >= mUndergrad, `本科=${mUndergrad} 硕士=${mGrad}`);

// 展位号排序
const r5 = runMatch(emptyCriteria, "booth");
check("展位号排序单调", r5.every((r, i) => i === 0 || boothNumber(r5[i - 1]!.company) <= boothNumber(r.company)));
check("默认无条件下数量不变", r5.length === fair.companies.length);
check("hasCriteria 空 = false / 有值 = true", !hasCriteria(emptyCriteria) && hasCriteria(cs));
check("hasCriteria 覆盖技能与期望岗位", hasCriteria({ ...emptyCriteria, skills: ["Python"] }) && hasCriteria({ ...emptyCriteria, jobIntent: ["tech"] }));

// 收藏过滤
const favNames = new Set([fair.companies[0]!.name, fair.companies[5]!.name]);
const rf = runMatch(emptyCriteria, "booth", { favoriteNames: favNames, favoritesOnly: true });
check("只看收藏只返回 2 家", rf.length === 2 && rf.every((r) => favNames.has(r.company.name)), `count=${rf.length}`);
check("收藏模式按展位排序", rf.every((r, i) => i === 0 || boothNumber(rf[i - 1]!.company) <= boothNumber(r.company)));
const rf2 = runMatch(emptyCriteria, "booth", { favoriteNames: favNames, favoritesOnly: false });
check("非收藏模式不受影响", rf2.length === fair.companies.length);
const rf3 = runMatch(emptyCriteria, "booth", { favoriteNames: favNames, favoritesOnly: true });
const rf4 = runMatch({ ...emptyCriteria, regions: ["linan"] }, "booth", { favoriteNames: favNames, favoritesOnly: true });
check("收藏可与筛选叠加", rf4.length <= rf3.length);

// 数据一致性
check("公司数量 237", fair.companies.length === 237, `actual=${fair.companies.length}`);
check("岗位总数与 meta 一致", fair.companies.reduce((s, c) => s + c.positions.length, 0) === fair.meta.totalPositions);
check("每个公司都有展位号", fair.companies.every((c) => c.booths.length > 0) || fair.companies.filter((c) => !c.booths.length).length < 3);

// 匹配 v2：专业命中加成（命中多个需求专业条目时加分）
const fakeCompany = {
  ...fair.companies[0]!,
  majors: [
    { degree: "本科", name: "计算机科学与技术" },
    { degree: "本科", name: "软件工程" },
    { degree: "本科", name: "网络工程" },
  ],
};
const mm = majorMatch(fakeCompany, "计算机科学与技术", "本科");
check("多条目命中 hits>=3 且 exact", mm.hits >= 3 && mm.level === "exact", `hits=${mm.hits} level=${mm.level}`);

// 匹配 v2：薪资按岗位达标覆盖率
const rCover = runMatch({ ...emptyCriteria, salaryFloor: 8000 }, "match");
check(
  "薪资达标 = 覆盖率>=60%",
  rCover.filter((r) => r.salary === "full").every((r) => r.salaryCoverage >= 0.6 - 1e-9),
);
check(
  "部分达标 = 0<覆盖率<60%",
  rCover.filter((r) => r.salary === "partial").every((r) => r.salaryCoverage > 0 && r.salaryCoverage < 0.6),
);
const covDistinct = new Set(rCover.map((r) => Math.round(r.salaryCoverage * 100)));
check("覆盖率有区分度（非简单两档）", covDistinct.size >= 5, `distinct=${covDistinct.size}`);

// 匹配 v2：技能维度计分
const baseMajor = runMatch({ ...emptyCriteria, major: "计算机科学与技术", degree: "本科" }, "match");
const withSkills = runMatch({ ...emptyCriteria, major: "计算机科学与技术", degree: "本科", skills: ["Python", "SQL"] }, "match");
const baseScoreMap = new Map(baseMajor.map((r) => [r.company.id, r.score]));
check(
  "加技能后同公司分数不降",
  withSkills.every((r) => r.score >= (baseScoreMap.get(r.company.id) ?? 0)),
);
check(
  "存在技能匹配结果与理由标签",
  withSkills.some((r) => r.skillHits.length > 0 && r.reasons.some((x) => x.label === "技能匹配")),
);

// 匹配 v2：期望岗位维度
const intentCriteria: Criteria = { ...emptyCriteria, jobIntent: ["trainee"] };
const rIntent = runMatch(intentCriteria, "match");
const intentHit = rIntent.filter((r) => r.intentHits.length > 0);
check("期望岗位（管培生）存在命中", intentHit.length > 0, `count=${intentHit.length}`);
check(
  "命中公司岗位含管培/培训生/储备/储干",
  intentHit.every((r) => r.company.positions.some((p) => /管培|培训生|储备|储干/.test(p.title))),
);
check(
  "方向命中单位排序在前",
  rIntent.slice(0, intentHit.length).every((r) => r.intentHits.length > 0),
);

// 简历识别
const resumeText = "浙江农林大学 本科 计算机科学与技术专业\n熟悉 Python、SQL 和数据分析\n期望月薪 8000 以上，希望在杭州工作\n英语六级";
const profile = analyzeResume(resumeText);
check("识别专业", profile.major === "计算机科学与技术", `major=${profile.major}`);
check("识别学历", profile.degree === "本科", `degree=${profile.degree}`);
check("识别期望薪资", profile.salaryFloor === 8000, `floor=${profile.salaryFloor}`);
check("识别技能", profile.skills.includes("Python") && profile.skills.includes("SQL"), profile.skills.join(","));

// 期望岗位识别：显式求职意向 & 技能推断
const profileIntent = analyzeResume("求职意向：财务/会计\n浙江农林大学 会计学 本科\n期望月薪 6000");
check("求职意向识别出财务方向", profileIntent.intents.includes("finance"), profileIntent.intents.join(","));
const profileSkillIntent = analyzeResume("熟悉 Python、SQL");
check("技能推断出技术方向", profileSkillIntent.intents.includes("tech"), profileSkillIntent.intents.join(","));

// v2：单项语言技能不再误判为外贸；句子片段不并入意向
const langOnly = analyzeResume("通过大学英语四级，喜欢阅读与运动");
check("单项语言技能不推断为外贸", !langOnly.intents.includes("trade"), langOnly.intents.join(",") || "(空)");
const intentPhrase = analyzeResume("求职意向：软件开发工程师（Java方向），有数据分析实习经历");
check(
  "意向短语命中技术、句子片段不并入",
  intentPhrase.intents.includes("tech") && !intentPhrase.intents.includes("data"),
  intentPhrase.intents.join(","),
);
const multiIntent = analyzeResume("求职意向：Java开发、自动化测试、数据分析");
check("多意向前三排序", multiIntent.intents.length >= 2 && multiIntent.intents.length <= 3, multiIntent.intents.join(","));

// v3：动词「翻译」不误判；简历头部岗位行识别为意向
const verbTrans = analyzeResume("能把业务问题翻译成解决方案，英语四级");
check(
  "翻译作动词不误判为技能/外贸",
  !verbTrans.skills.includes("翻译") && !verbTrans.intents.includes("trade"),
  `${verbTrans.skills.join(",")}|${verbTrans.intents.join(",") || "(空)"}`,
);
const headIntent = analyzeResume("汪宋军\n销售工程师\n浙江农林大学 计算机科学与技术（本科）");
check("头部岗位行识别出销售方向", headIntent.intents.includes("sales"), headIntent.intents.join(","));

const advice = buildAdvice(profile, resumeToCriteria(profile));
check("建议非空", advice.notes.length > 0, `${advice.notes.length} 条`);
check("推荐不超过 6 家", advice.recommendations.length <= 6, `count=${advice.recommendations.length}`);
check(
  "推荐按分数降序",
  advice.recommendations.every((r, i) => i === 0 || advice.recommendations[i - 1]!.score >= r.score),
);

// 收藏导出
const exportNames = new Set([fair.companies[0]!.name, fair.companies[3]!.name]);
const exportCompanies = orderedFavorites(exportNames);
check("导出按展位排序", exportCompanies.length === 2 && boothNumber(exportCompanies[0]!) <= boothNumber(exportCompanies[1]!));
const csv = favoritesCsv(exportCompanies);
check("CSV 带 BOM 与表头与单位名", csv.startsWith("\uFEFF") && csv.includes("展位号") && csv.includes(exportCompanies[0]!.name));
check("CSV 行数 = 表头 + 2", csv.split("\r\n").length === 3, `lines=${csv.split("\r\n").length}`);
const txt = favoritesText(exportCompanies);
check("文本清单含展位与单位", txt.includes(`展位 ${exportCompanies[0]!.booths.join(" / ")}`) && txt.includes(exportCompanies[0]!.name));

// 图谱数据（chain.json）一致性
const chainTotals = chainData.chains.reduce(
  (n: number, ch) => n + ch.segments.reduce((m, s) => m + s.companies.length, 0),
  0,
);
check("图谱数据：13 条链 / 237 家守恒", chainData.chains.length === 13 && chainTotals === 237, `chains=${chainData.chains.length} companies=${chainTotals}`);
check(
  "图谱数据：meta 总数与明细一致",
  chainData.meta.totals.companies === 237 && chainData.meta.totals.positions === 654 && chainData.meta.totals.headcount === 5880,
);
const chainNames = new Set(chainData.chains.map((ch) => ch.name));
check("图谱数据：链名无重复", chainNames.size === chainData.chains.length);
check("图谱数据：学院流向存在", chainData.collegeFlow.length > 50, `flows=${chainData.collegeFlow.length}`);
const flowColleges = new Set(chainData.collegeFlow.map((f) => f.college));
check("图谱数据：学院覆盖 >= 13", flowColleges.size >= 13, `colleges=${flowColleges.size}`);
const flowPos = chainData.collegeFlow.reduce((n, f) => n + f.positions, 0);
check("图谱数据：学院流向岗位量在合理区间", flowPos > 300 && flowPos <= 654.5, `pos=${flowPos.toFixed(1)}`);
const sampleChainCompany = chainData.chains[0]!.segments[0]!.companies[0]!;
check("图谱数据：公司字段完整", Boolean(sampleChainCompany.name && sampleChainCompany.industry && Array.isArray(sampleChainCompany.positions)));

console.log("\n前 5 家（计算机科学与技术/本科）：");
for (const r of r1.slice(0, 5)) {
  console.log(`  ${r.pct}% [${r.major.level}] 展位${r.company.booths.join("/")} ${r.company.name} | ${r.company.industry} | ${r.company.location}`);
}

if (failed > 0) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n全部通过");
