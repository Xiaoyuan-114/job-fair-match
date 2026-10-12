import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChainGraph, type ChainData } from "./ChainGraph";
import { CollegeAdapt } from "./CollegeAdapt";
import { DemandOverview } from "./DemandOverview";

const SUBS = [
  { key: "graph", label: "产业链图谱" },
  { key: "college", label: "专业适配" },
  { key: "demand", label: "需求总览" },
] as const;

type SubKey = (typeof SUBS)[number]["key"];

export function ChainHub({ onGoMatch }: { onGoMatch: (name: string) => void }) {
  const [data, setData] = useState<ChainData | null>(null);
  const [sub, setSub] = useState<SubKey>("graph");

  useEffect(() => {
    let alive = true;
    import("@/data/chain.json").then((m) => {
      if (alive) setData(m.default as unknown as ChainData);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      {/* 子视图切换（吸附在主导航之下） */}
      <div className="sticky top-0 z-30 -mx-4 h-11 border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex h-full items-center gap-1.5 overflow-x-auto scrollbar-none">
          {SUBS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSub(s.key);
                window.scrollTo({ top: 0 });
              }}
              aria-pressed={sub === s.key}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                sub === s.key ? "border-primary bg-primary font-medium text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto hidden shrink-0 pl-3 text-[11px] text-muted-foreground sm:inline">与「岗位匹配」同源数据 · 展位号可对照</span>
        </div>
      </div>

      {!data ? (
        <div className="mt-10 flex items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-sm text-muted-foreground">
          <span className="size-2 animate-ping rounded-full bg-primary/60" />
          正在加载图谱数据…
        </div>
      ) : (
        <>
          {sub === "graph" && <ChainGraph data={data} onGoMatch={onGoMatch} />}
          {sub === "college" && <CollegeAdapt data={data} />}
          {sub === "demand" && <DemandOverview data={data} />}
        </>
      )}
    </div>
  );
}
