import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard, downloadTextFile, favoritesCsv, favoritesFilename, favoritesText, orderedFavorites } from "./exportFavorites";
import { Download, Copy, Check } from "lucide-react";

export function FavoritesToolbar({ names }: { names: Set<string> }) {
  const [copied, setCopied] = useState(false);
  const companies = orderedFavorites(names);
  if (companies.length === 0) return null;

  const exportCsv = () => {
    downloadTextFile(favoritesFilename("csv"), favoritesCsv(companies));
  };

  const exportText = async () => {
    const ok = await copyToClipboard(favoritesText(companies));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed bg-card px-3 py-2">
      <span className="text-xs font-medium">收藏清单（{companies.length} 家）</span>
      <span className="hidden text-[11px] text-muted-foreground sm:inline">导出全部收藏，按展位号排列，可打印或分享</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={exportCsv}>
          <Download className="size-3.5" />
          导出 CSV（Excel）
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={exportText}>
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制文本清单"}
        </Button>
      </div>
    </div>
  );
}
