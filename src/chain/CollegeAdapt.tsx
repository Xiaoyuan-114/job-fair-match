import { useMemo } from "react";
import type { ChainData } from "./ChainGraph";
import { SankeyChart } from "./SankeyChart";
import { colorByName } from "./palette";

export function CollegeAdapt({ data }: { data: ChainData }) {
  const chainNames = data.chains.map((c) => c.name);
  const flows = data.collegeFlow;

  const collegeTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const f of flows) totals.set(f.college, (totals.get(f.college) ?? 0) + f.positions);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [flows]);
  const collegeOrder = collegeTotals.map(([c]) => c);

  const links = flows.map((f) => ({ from: f.college, to: f.chain, value: Math.max(0.2, f.positions) }));

  const rankRows = collegeTotals.map(([name, total]) => {
    const fs = flows.filter((f) => f.college === name);
    const topChain = fs.reduce((best, f) => (f.positions > (best?.positions ?? -1) ? f : best), fs[0]);
    return { name, total, chains: fs.length, topChain: topChain?.chain ?? "", topValue: topChain?.positions ?? 0 };
  });
  const maxTotal = Math.max(1, ...rankRows.map((r) => r.total));

  const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));
  const sortedChainsForColor = [...chainNames];

  return (
    <div>
      <div className="mt-4 rounded-xl border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
        <span className="font-medium text-primary">怎么看</span>：左边是浙农林学院，右边是产业链，流向线宽 = 该学院专业可对应的在招岗位数。{data.meta.collegeNote}
      </div>

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">学院 → 产业链 岗位流向</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">岗位数均摊至单位覆盖的学院；小屏可左右滑动查看</p>
        <div className="mt-3 -mx-1">
          <SankeyChart
            links={links}
            leftOrder={collegeOrder}
            rightOrder={sortedChainsForColor}
            colorsOf={(side, name) => (side === "L" ? colorByName(collegeOrder, name) : colorByName(sortedChainsForColor, name))}
            unit="岗"
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">学院岗位机会排行（均摊口径）</h2>
        <div className="mt-3 space-y-1.5">
          {rankRows.map((r, i) => (
            <div key={r.name} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="w-[132px] shrink-0 truncate text-xs font-medium sm:w-[176px]" title={r.name}>
                {r.name}
              </span>
              <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(3, (r.total / maxTotal) * 100)}%`, background: colorByName(collegeOrder, r.name) }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{fmt(r.total)} 岗</span>
              {r.topChain && (
                <span className="hidden w-44 shrink-0 truncate text-[11px] text-muted-foreground md:inline" title={`${r.topChain} · ${fmt(r.topValue)} 岗`}>
                  主要去向：{r.topChain}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          「其他专业」为未映射到学院口径的条目（如「理工科相关专业」「小语种」等）；单位岗位数在多个学院间均摊，数值为机会量级参考。
        </p>
      </section>

      <footer className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          {data.meta.sourceNote}。{data.meta.privacyNote}
        </p>
      </footer>
    </div>
  );
}
