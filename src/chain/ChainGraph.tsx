import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Search } from "lucide-react";
import { SankeyChart } from "./SankeyChart";
import { CHAIN_COLORS } from "./palette";
import { TreeView } from "./TreeView";

type Pos = { t: string; s: number[] | null };
type Company = {
  name: string;
  industry: string;
  colleges: string[];
  intro: string;
  size: string;
  city: string;
  booths: string[];
  tags: string[];
  headcount: number | null;
  salary: number[] | null;
  positions: Pos[];
  majors: string[];
};
type Segment = { name: string; companies: Company[] };
type Chain = {
  name: string;
  companies: number;
  positions: number;
  headcount: number;
  salary: number[] | null;
  segments: Segment[];
};
export type CollegeFlow = { college: string; chain: string; units: number; positions: number; headcount: number };
export type ChainData = {
  meta: {
    title: string;
    subtitle: string;
    asOf: string;
    sourceNote: string;
    privacyNote: string;
    collegeNote: string;
    collegeOrder: string[];
    totals: { companies: number; positions: number; headcount: number; chains: number };
  };
  chains: Chain[];
  collegeFlow: CollegeFlow[];
};

type SortKey = "companies" | "positions" | "headcount";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "companies", label: "按企业数" },
  { key: "positions", label: "按岗位数" },
  { key: "headcount", label: "按需求人数" },
];

const COLORS = CHAIN_COLORS;

const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("zh-CN"));

function sal(s: number[] | null): string {
  if (!s || (s[0] == null && s[1] == null)) return "面议";
  if (s[0] != null && s[1] != null) return s[0] === s[1] ? num(s[0]) : `${num(s[0])}–${num(s[1])}`;
  return s[0] != null ? `${num(s[0])} 起` : `≤ ${num(s[1])}`;
}

function matchCo(c: Company, q: string): boolean {
  if (!q) return true;
  const hay = `${c.name} ${c.industry} ${c.city} ${c.positions.map((p) => p.t).join(" ")} ${c.majors.join(" ")}`.toLowerCase();
  return hay.includes(q);
}

function smoothScrollTo(el: HTMLElement) {
  const targetY = window.scrollY + el.getBoundingClientRect().top - 60;
  const startY = window.scrollY;
  const dist = targetY - startY;
  if (Math.abs(dist) < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY);
    return;
  }
  const dur = Math.min(600, Math.max(240, Math.abs(dist) / 4));
  let t0: number | null = null;
  const step = (ts: number) => {
    if (t0 === null) t0 = ts;
    const p = Math.min(1, (ts - t0) / dur);
    window.scrollTo(0, startY + dist * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function CompanyRow({
  c,
  open,
  forcedOpen,
  onToggle,
  onGoMatch,
}: {
  c: Company;
  open: boolean;
  forcedOpen: boolean;
  onToggle: () => void;
  onGoMatch: (name: string) => void;
}) {
  const expanded = open || forcedOpen;
  return (
    <li className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent/70 sm:grid-cols-[1fr_auto_auto] sm:gap-y-0.5"
      >
        <span className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="min-w-0 text-[13.5px] leading-snug font-semibold break-words">{c.name}</span>
          {c.booths.length > 0 && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">展位 {c.booths.join("/")}</span>
          )}
          {c.tags.map((t) => (
            <span
              key={t}
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                t === "校友企业" ? "border-amber-500/60 bg-amber-50 text-amber-800" : "border-sky-500/40 bg-sky-50 text-sky-800",
              )}
            >
              {t}
            </span>
          ))}
        </span>
        <span className="col-start-2 row-start-1 justify-self-end text-[13px] font-semibold text-amber-700 tabular-nums sm:col-start-2 sm:row-start-1">
          {sal(c.salary)}
          {c.salary ? <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">元/月</span> : null}
        </span>
        <span className={cn("col-start-1 row-start-2 text-xs text-muted-foreground tabular-nums sm:col-span-3 sm:row-start-2", "sm:col-start-1")}>
          {[c.industry, c.size, c.city].filter(Boolean).join(" · ")}
          {c.positions.length > 0 ? ` · ${c.positions.length} 个岗位` : " · 岗位现场咨询"}
          {c.headcount ? ` · 需求 ${c.headcount} 人` : ""}
        </span>
        <span className={cn("col-start-2 row-start-2 justify-self-end text-xs text-muted-foreground transition-transform sm:col-start-3 sm:row-start-1", expanded && "rotate-90")}>
          ▸
        </span>
      </button>
      {expanded && (
        <div className="pb-4">
          {c.positions.length > 0 ? (
            <ul className="divide-y divide-border/60 rounded-lg border">
              {c.positions.map((p) => (
                <li key={p.t} className="flex items-baseline justify-between gap-3 px-3 py-2 text-xs">
                  <span className="min-w-0 break-words">{p.t}</span>
                  <span className={cn("shrink-0 font-medium tabular-nums", p.s ? "text-amber-700" : "text-muted-foreground")}>{sal(p.s)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">该单位未填报具体职位，可到展位现场咨询。</p>
          )}
          {c.majors.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">需求专业</span>
              {c.majors.map((m) => (
                <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                  {m}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 sm:flex sm:justify-end">
            <Button variant="outline" size="sm" className="h-8 w-full gap-1 text-xs sm:w-auto" onClick={() => onGoMatch(c.name)}>
              在岗位匹配中查看这家
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ChainGraph({ data, onGoMatch }: { data: ChainData; onGoMatch: (name: string) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("companies");
  const [mode, setMode] = useState<"tree" | "list">("list");
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => [...data.chains].sort((a, b) => b[sort] - a[sort]), [data, sort]);
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    data.chains.forEach((ch, i) => map.set(ch.name, COLORS[i % COLORS.length]));
    return map;
  }, [data]);

  const ql = q.trim().toLowerCase();
  const view = useMemo(
    () =>
      sorted
        .map((ch) => ({
          ...ch,
          segments: ch.segments
            .map((seg) => ({ name: seg.name, companies: seg.companies.filter((c) => matchCo(c, ql)) }))
            .filter((s) => s.companies.length > 0),
        }))
        .filter((ch) => ch.segments.length > 0),
    [sorted, ql],
  );
  const hitCount = view.reduce((n, ch) => n + ch.segments.reduce((m, s) => m + s.companies.length, 0), 0);

  // 产业链结构流量：产业链 → 环节（按岗位数）
  const structureLinks = useMemo(
    () =>
      data.chains.flatMap((ch) =>
        ch.segments.map((seg) => ({ from: ch.name, to: seg.name, value: seg.companies.reduce((n, c) => n + c.positions.length, 0) })),
      ),
    [data],
  );
  const segmentChain = useMemo(() => {
    const map = new Map<string, string>();
    data.chains.forEach((ch) => ch.segments.forEach((seg) => map.set(seg.name, ch.name)));
    return map;
  }, [data]);

  const maxVal = Math.max(1, ...sorted.map((ch) => ch[sort]));
  const rankOf = (name: string) => sorted.findIndex((ch) => ch.name === name);

  const toggle = (name: string) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div>
      {/* 工具栏：视图模式 + 搜索 +（列表模式）排序；吸附在子视图切换条之下 */}
      <div className="sticky top-11 z-20 -mx-4 mt-4 border-b bg-background/90 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="inline-flex shrink-0 rounded-full border border-border bg-card p-0.5">
            {([
              ["list", "列表视图"],
              ["tree", "树视图"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={mode === key}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  mode === key ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 basis-44 sm:max-w-xs sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="chain-keyword"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索单位 / 岗位 / 专业，如：机械、会计、外贸"
              aria-label="在图谱中搜索"
              className="h-9 bg-card pl-8"
            />
          </div>
          {mode === "list" && (
            <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:w-auto sm:pb-0">
              <span className="shrink-0 text-xs text-muted-foreground">排序</span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  aria-pressed={sort === s.key}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                    sort === s.key ? "border-primary bg-primary font-medium text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {mode === "list" && (
            <span className="text-xs text-muted-foreground sm:ml-auto" aria-live="polite">
              {ql ? `匹配 ${hitCount} 家单位` : `共 ${data.meta.totals.companies} 家 · ${data.meta.totals.chains} 条产业链`}
            </span>
          )}
        </div>
      </div>

      {mode === "tree" ? (
        <TreeView data={data} q={q} onGoMatch={onGoMatch} />
      ) : (
        <>

      {/* 口径说明 */}
      <div className="mt-3 rounded-xl border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
        <span className="font-medium text-primary">拆分口径</span>：通用产业链拆分（不绑定官方规划），按单位主营业务与在招岗位归入 {data.meta.totals.chains} 条产业链、再细分环节，规则为主、少量人工校准。
        <span className="font-medium text-primary">数据口径</span>：{data.meta.sourceNote}。{data.meta.privacyNote}
      </div>

      {/* 产业链结构流量图（产业 → 环节，按岗位数缩放；移动端横向滑动查看） */}
      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">产业链结构</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">产业 → 环节（线宽按在招岗位数缩放，共 {data.meta.totals.positions} 个岗位）；小屏可左右滑动查看</p>
        <div className="mt-3 -mx-1">
          <SankeyChart
            links={structureLinks}
            leftOrder={sorted.map((ch) => ch.name)}
            colorsOf={(side, name) => (side === "L" ? (colorOf.get(name) ?? COLORS[0]) : (colorOf.get(segmentChain.get(name) ?? "") ?? COLORS[0]))}
            unit="岗"
          />
        </div>
      </section>

      {/* 产业链总览：移动端为「名称行 + 通栏进度条」，点按跳转 */}
      <section className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold">产业链总览</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">点按条形跳转到对应产业链；长度按当前排序口径缩放</p>
        <div className="mt-3 space-y-1">
          {sorted.map((ch, i) => {
            const color = colorOf.get(ch.name) ?? COLORS[0];
            return (
              <button
                key={ch.name}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`chain-section-${i}`);
                  if (el) smoothScrollTo(el);
                }}
                className="block w-full rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-accent/50 active:bg-accent/70"
              >
                <span className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-[3px]" style={{ background: color }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium sm:text-[13px]">{ch.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {ch.companies} 家 · {ch.positions} 岗 · 需 {num(ch.headcount)} 人
                  </span>
                </span>
                <span className="mt-1 flex">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${Math.max(4, (ch[sort] / maxVal) * 100)}%`, background: color }}
                    />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 产业链明细 */}
      <div className="mt-4 space-y-4">
        {view.map((ch) => {
          const color = colorOf.get(ch.name) ?? COLORS[0];
          return (
            <section key={ch.name} id={`chain-section-${rankOf(ch.name)}`} className="scroll-mt-16 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-l-4 px-4 py-3 sm:px-5" style={{ borderLeftColor: color }}>
                <h2 className="text-[15px] font-semibold sm:text-base">{ch.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  <b className="font-semibold text-primary">{ch.companies}</b> 家单位 · <b className="font-semibold text-primary">{ch.positions}</b> 个岗位 · 需求{" "}
                  <b className="font-semibold text-primary">{num(ch.headcount)}</b> 人{ch.salary ? ` · 月薪 ${sal(ch.salary)} 元` : ""}
                </p>
              </div>
              <div className="px-3 pb-3 sm:px-5 sm:pb-5">
                {ch.segments.map((seg) => (
                  <div key={seg.name} className="mt-2">
                    <div className="flex items-baseline gap-2 border-b border-dashed py-2 text-[13px] font-medium">
                      {seg.name}
                      <span className="text-xs font-normal text-muted-foreground">{seg.companies.length} 家</span>
                    </div>
                    <ul>
                      {seg.companies.map((c) => (
                        <CompanyRow
                          key={c.name}
                          c={c}
                          open={openSet.has(c.name)}
                          forcedOpen={ql.length >= 2}
                          onToggle={() => toggle(c.name)}
                          onGoMatch={onGoMatch}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {view.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <p className="text-sm text-muted-foreground">没有匹配「{q.trim()}」的单位，换个关键词试试。</p>
            <Button variant="outline" size="sm" onClick={() => setQ("")}>
              清空搜索
            </Button>
          </div>
        )}
      </div>

      <footer className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          {data.meta.sourceNote}。{data.meta.privacyNote}
        </p>
        <p className="mt-1">
          产业链归类为展示性速览（分类与行业字段经人工校准）；汇总按参会单位计数，同一法人主体的多个分公司/营业部分别计；岗位与薪资以单位填报为准，展位号可用于现场对照。
        </p>
      </footer>
          </>
        )}
    </div>
  );
}
