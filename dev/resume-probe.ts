// 简历识别探针：对真实简历 PDF 跑「解析 → 识别 → 建议」全链路，输出质量报告。
// 用法：npx vite build --ssr dev/resume-probe.ts --outDir dev/probe-dist && node dev/probe-dist/resume-probe.js
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { analyzeResume, buildAdvice, resumeToCriteria } from "../src/fair/resume";

const FILES = [
  "D:/des/PR/简历/母版/汪宋军-浙江农林大学-FDE工程师.pdf",
  "D:/des/PR/简历/母版/汪宋军-浙江农林大学-售前工程师-新.pdf",
  "D:/des/PR/简历/母版/汪宋军-浙江农林大学-销售工程师.pdf",
];

type PdfTextItem = { str?: string; hasEOL?: boolean };

function itemsToText(items: PdfTextItem[]): string {
  let out = "";
  for (const item of items) {
    const s = item.str ?? "";
    if (s) {
      const needSpace = out !== "" && !out.endsWith("\n") && /[a-zA-Z0-9]$/.test(out) && /^[a-zA-Z0-9]/.test(s);
      out += (needSpace ? " " : "") + s;
    }
    if (item.hasEOL) out += "\n";
  }
  return out;
}

async function extractPdf(path: string): Promise<string> {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = itemsToText(content.items as PdfTextItem[]).trim();
    if (text) pages.push(text);
  }
  return pages.join("\n");
}

async function main() {
  for (const file of FILES) {
    console.log("\n" + "=".repeat(72));
    console.log("### " + file.split("/").pop());
    let text = "";
    try {
      text = await extractPdf(file);
    } catch (e) {
      console.log("PDF 解析失败:", (e as Error).message);
      continue;
    }
    console.log(`提取文本长度: ${text.length}`);
    console.log("---- 文本前 300 字 ----\n" + text.slice(0, 300).replace(/\n+/g, " / "));

    const p = analyzeResume(text);
    console.log("---- 识别结果 ----");
    console.log("专业:", p.major, "| 候选:", p.majors.join("、") || "(无)");
    console.log("学历:", p.degree);
    console.log("期望月薪:", p.salaryFloor);
    console.log(`技能（${p.skills.length}）:`, p.skills.join("、") || "(无)");
    console.log("期望岗位:", p.intents.join("、") || "(无)");

    const criteria = resumeToCriteria(p);
    const advice = buildAdvice(p, criteria);
    console.log("---- 建议 ----");
    for (const n of advice.notes) console.log(`[${n.tone}] ${n.text}`);
    console.log("---- 推荐前 5 ----");
    for (const m of advice.recommendations.slice(0, 5)) {
      console.log(`  ${m.pct}% 展位${m.company.booths.join("/")} ${m.company.name} (${m.reasons.map((r) => r.label).join("/")})`);
    }
  }
}

main().catch((e) => {
  console.error("PROBE FAILED:", e);
  process.exit(1);
});
