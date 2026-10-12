import { fair, fmtSalary, salaryRange, boothNumber, type Company } from "./matching";

const HEADERS = [
  "展位号",
  "单位名称",
  "单位行业",
  "单位所在地",
  "需求人数",
  "薪资区间(元/月)",
  "岗位(含薪资)",
  "需求专业",
  "单位标签",
  "联系人",
  "联系电话",
  "投递邮箱",
  "详细地址",
];

export function orderedFavorites(names: Set<string>): Company[] {
  return fair.companies.filter((c) => names.has(c.name)).sort((a, b) => boothNumber(a) - boothNumber(b));
}

export function favoritesCsv(companies: Company[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = companies.map((c) => {
    const range = salaryRange(c);
    return [
      c.booths.join("/"),
      c.name,
      c.industry,
      c.location,
      c.headcount !== null ? String(c.headcount) : "",
      range ? `${range.min}-${range.max}` : "",
      c.positions.map((p) => `${p.title}（${fmtSalary(p.salaryMin, p.salaryMax)}）`).join("；"),
      c.majors.map((m) => m.name).join("、"),
      c.tags.join("、"),
      c.contact,
      c.phone,
      c.email,
      c.address,
    ]
      .map(esc)
      .join(",");
  });
  return "\uFEFF" + [HEADERS.map(esc).join(","), ...rows].join("\r\n");
}

export function favoritesText(companies: Company[]): string {
  const lines: string[] = [`招聘会收藏清单（共 ${companies.length} 家，按展位号排列）`, ""];
  companies.forEach((c, i) => {
    lines.push(`${i + 1}. 展位 ${c.booths.join(" / ")} · ${c.name}`);
    const meta = [c.industry, c.size, c.location].filter(Boolean).join(" · ");
    if (meta) lines.push(`   ${meta}`);
    if (c.positions.length > 0) {
      lines.push(`   岗位：${c.positions.map((p) => `${p.title}（${fmtSalary(p.salaryMin, p.salaryMax)}）`).join("、")}`);
    }
    if (c.headcount) lines.push(`   需求：${c.headcount} 人`);
    const contact = [c.contact, c.phone, c.email].filter(Boolean).join(" · ");
    if (contact) lines.push(`   联系：${contact}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function favoritesFilename(ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `招聘会收藏清单-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${ext}`;
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 回退到旧接口
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
