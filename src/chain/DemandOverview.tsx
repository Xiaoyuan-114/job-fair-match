import { useMemo } from "react";
import type { ChainData } from "./ChainGraph";
import { CHAIN_COLORS } from "./palette";
import { DIRECTIONS } from "../fair/matching";

/* 能力热力用的能力类别：岗位方向去掉「管培生」大类（无具体能力指向） */
const HEAT_DIRS = DIRECTIONS.filter((d) => d.id !== "trainee");

const num = (n: number) => Number(n).toLocaleString("zh-CN");

export function DemandOverview({ data }: { data: ChainData }) {
  const chainRank = useMemo(() => [...data.chains].sort((a, b) => b.positions - a.positions), [data]);
  const segRank = useMemo(() => {
    const segs = data.chains.flatMap((ch) =>
      ch.segments.map((seg) => ({
        chain: ch.name,
        name: seg.name,
        positions: seg.companies.reduce((n, c) => n + c.positions.length, 0),
        headcount: seg.companies.reduce((n, c) => n + (c.headcount ?? 0), 0),
        companies: seg.companies,
      })),
    );
    segs.sort((a, b) => b.positions - a.positions);
    return segs;
  }, [data]);

  const maxChainPos = Math.max(1, ...chainRank.map((c) => c.positions));
  const topSegs = segRank.slice(0, 15);
  const maxSegPos = Math.max(1, ...topSegs.map((s) => s.positions));

  /* 能力热力：环节（Top 16）× 能力类别（由在招岗位名称关键词映射） */
  const heat = useMemo(() => {
    const rows = segRank.slice(0, 16);
    const counts = rows.map((seg) => {
      const arr = new Array(HEAT_DIRS.length).fill(0) as number[];
      for (const c of seg.companies) {
        for (const p of c.positions) {
          const t = p.t.toLowerCase();
          HEAT_DIRS.forEach((d, i) => {
            if (d.keywords.some((k) => t.includes(k.toLowerCase()))) arr[i] += 1;
          });
        }
      }
      return arr;
    });
    const max = Math.max(1, ...counts.flat());
    return { rows, counts, max };
  }, [segRank]);

  return (
    <div>
      <div className="mt-4 rounded-xl border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
        <span className="font-medium text-primary">数据同源</span>：与岗位匹配、产业链图谱使用同一份报名导出（{data.meta.totals.companies} 家 / {data.meta.totals.positions} 岗 / 需求{" "}
        {num(data.meta.totals.headcount)} 人）。能力指向由在招岗位名称按关键词映射，非单位自主填报。
      </div>

      {/* 产业链需求排行 */}
      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">产业链需求排行（按岗位数）</h2>
        <div className="mt-3 space-y-1.5">
          {chainRank.map((ch, i) => (
            <div key={ch.name} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="w-[118px] shrink-0 truncate text-xs font-medium sm:w-[168px]" title={ch.name}>
                {ch.name}
              </span>
              <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(3, (ch.positions / maxChainPos) * 100)}%`, background: CHAIN_COLORS[i % CHAIN_COLORS.length] }}
                />
              </span>
              <span className="w-[104px] shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {ch.positions} 岗 · {ch.companies} 家
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">需求人数合计 {num(data.meta.totals.headcount)} 人（未填报按 0 计）</p>
      </section>

      {/* 环节排行 */}
      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">热门环节 Top 15（按岗位数）</h2>
        <div className="mt-3 space-y-1.5">
          {topSegs.map((s, i) => (
            <div key={`${s.chain}-${s.name}`} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs" title={`${s.chain} · ${s.name}`}>
                <span className="text-muted-foreground">{s.chain}</span>
                <span className="mx-1 text-border">·</span>
                <span className="font-medium">{s.name}</span>
              </span>
              <span className="hidden w-14 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums sm:inline">{s.headcount ? `${s.headcount} 人` : ""}</span>
              <span className="h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-secondary sm:w-40">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (s.positions / maxSegPos) * 100)}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{s.positions} 岗</span>
            </div>
          ))}
        </div>
      </section>

      {/* 能力热力矩阵 */}
      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">环节 × 能力指向 热力矩阵</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">纵轴为岗位数 Top 16 的环节；单元格数字 = 该环节岗位名称映射到该能力类别的岗位数；小屏可左右滑动查看</p>
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: `150px repeat(${HEAT_DIRS.length}, minmax(0, 1fr))` }}>
              <span className="pr-2 text-right text-[11px] text-muted-foreground">环节 \ 能力</span>
              {HEAT_DIRS.map((d) => (
                <span key={d.id} className="pb-1 text-center text-[11px] leading-tight text-muted-foreground">
                  {d.label.replace("／", "·")}
                </span>
              ))}
              {heat.rows.map((seg, ri) => (
                <div key={`${seg.chain}-${seg.name}`} className="contents">
                  <span className="truncate pr-2 text-right text-xs" title={`${seg.chain} · ${seg.name}`}>
                    {seg.name}
                  </span>
                  {heat.counts[ri]!.map((v, ci) => {
                    const a = v === 0 ? 0 : 0.1 + 0.85 * (v / heat.max);
                    return (
                      <span
                        key={HEAT_DIRS[ci]!.id}
                        className="flex h-8 items-center justify-center rounded-md text-[11px] tabular-nums"
                        style={{ background: v === 0 ? "var(--secondary)" : `rgba(27,122,67,${a.toFixed(2)})`, color: a > 0.5 ? "#fff" : "#26323c" }}
                        title={`${seg.name} × ${HEAT_DIRS[ci]!.label}：${v} 个岗位`}
                      >
                        {v > 0 ? v : ""}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>少</span>
          <span className="h-2.5 w-32 rounded-full" style={{ background: "linear-gradient(90deg, rgba(27,122,67,.08), rgba(27,122,67,.95))" }} />
          <span>多</span>
          <span className="ml-2">能力类别由岗位名称关键词映射（如「开发 / 工程师」→ 技术·研发）；综合管培岗位未计入具体能力类。</span>
        </div>
      </section>

      <footer className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          {data.meta.sourceNote}。{data.meta.privacyNote}
        </p>
      </footer>
    </div>
  );
}
