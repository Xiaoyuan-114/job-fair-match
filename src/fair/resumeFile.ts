// 简历文件的本机解析：PDF 提取文字层（pdf.js），Word 解析（mammoth）。
// 两个库都用动态 import 懒加载，用户不传文件就不加载对应代码块。

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

export async function extractPdfText(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = itemsToText(content.items as PdfTextItem[]).trim();
    if (text) pages.push(text);
    page.cleanup();
  }
  await task.destroy();
  return pages.join("\n");
}

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
