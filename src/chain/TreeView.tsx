import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, X } from "lucide-react";
import type { ChainData } from "./ChainGraph";
import { CHAIN_COLORS } from "./palette";

type Company = ChainData["chains"][number]["segments"][number]["companies"][number];

type Sel =
  | { type: "chain"; chain: string }
  | { type: "segment"; chain: string; seg: string }
  | { type: "company"; chain: string; seg: string; name: string };

const SEG_ROW = 34;
const CO_ROW = 27;
const CHAIN_GAP = 14;
const X_ROOT = 10;
const W_ROOT = 92;
const X_CHAIN = 150;
const W_CHAIN = 118;
const X_SEG = 322;
const W_SEG = 180;
const X_CO = 532;
const SVG_W = 792;

const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("zh-CN"));

function sal(s: number[] | null): string {
  if (!s || (s[0] == null && s[1] == null)) return "面议";
  if (s[0] != null && s[1] != null) return s[0] === s[1] ? num(s[0]) : `${num(s[0])}–${num(s[1])}`;
  return s[0] != null ? `${num(s[0])} 起` : `≤ ${num(s[1])}`;
}

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function dotOf(c: Company): { color: string; r: number } {
  const top = c.tags.some((t) => t.includes("500强") || t === "上市公司");
  const alumni = c.tags.includes("校友企业");
  const color = top ? "#c53030" : alumni ? "#1b7a43" : "#8a97a3";
  const r = 3.2 + Math.min(2.4, (c.headcount ?? 0) / 40);
  return { color, r };
}

function matchCompany(c: Company, ql: string): boolean {
  if (!ql) return true;
  const hay = `${c.name} ${c.industry} ${c.city} ${c.positions.map((p) => p.t).join(" ")} ${c.majors.join(" ")}`.toLowerCase();
  return hay.includes(ql);
}

export function countTreeMatches(data: ChainData, q: string): number {
  const ql = q.trim().toLowerCase();
  if (!ql) return data.meta.totals.companies;
  let n = 0;
  for (const ch of data.chains) for (const seg of ch.segments) for (const c of seg.companies) if (matchCompany(c, ql)) n += 1;
  return n;
}

/* ---------- 落点布局：根 → 产业链 → 环节 → 企业 ----------
   环节块高度 = max(单行, 企业堆叠高度)，企业围绕环节节点上下对称排布，
   连线用「括号式」（横引线 + 竖脊 + 枝杈），避免长弧线缠绕。 */
type SegLay = { chainName: string; color: string; name: string; y: number; companies: { c: Company; y: number }[]; total: number };
type ChainLay = { name: string; color: string; y: number; collapsed: boolean };

const CO_PAD = 8;

function buildLayout(data: ChainData, ql: string, collapsed: Set<string>, expandedSeg: string | null) {
  const chainLays: ChainLay[] = [];
  const segLays: SegLay[] = [];
  let y = 14;

  data.chains.forEach((ch, ci) => {
    const color = CHAIN_COLORS[ci % CHAIN_COLORS.length]!;
    const chainHit = ql.length > 0 && ch.name.toLowerCase().includes(ql);
    const isCollapsed = collapsed.has(ch.name);
    const startY = y;

    if (!isCollapsed) {
      for (const seg of ch.segments) {
        const segHit = ql.length > 0 && seg.name.toLowerCase().includes(ql);
        let list = ql ? seg.companies.filter((c) => matchCompany(c, ql)) : [];
        if ((chainHit || segHit) && ql) list = seg.companies;
        if (ql && list.length === 0) continue;
        if (!ql && expandedSeg === `${ch.name}|${seg.name}`) list = seg.companies;

        const stackH = list.length * CO_ROW;
        const blockH = list.length > 0 ? Math.max(SEG_ROW + 6, stackH + CO_PAD * 2) : SEG_ROW;
        const segY = y + blockH / 2;
        const firstCoY = segY - stackH / 2 + CO_ROW / 2;
        segLays.push({
          chainName: ch.name,
          color,
          name: seg.name,
          y: segY,
          total: seg.companies.length,
          companies: list.map((c, i) => ({ c, y: firstCoY + i * CO_ROW })),
        });
        y += blockH;
      }
    }

    if (y === startY) {
      if (!isCollapsed) return; // 搜索过滤掉的链整条隐藏
      y += SEG_ROW;
    }
    chainLays.push({ name: ch.name, color, y: startY + (y - startY) / 2, collapsed: isCollapsed });
    y += CHAIN_GAP;
  });

  const totalH = Math.max(y - CHAIN_GAP + 12, 120);
  const rootY = (14 + totalH - 12) / 2;
  return { chainLays, segLays, totalH, rootY };
}

/* ---------- 右侧详情面板（桌面侧栏 / 移动端底部卡片共用） ---------- */
function Panel({
  data,
  sel,
  onSelect,
  onGoMatch,
  onClose,
  mobile,
}: {
  data: ChainData;
  sel: Sel | null;
  onSelect: (s: Sel) => void;
  onGoMatch: (name: string) => void;
  onClose: () => void;
  mobile?: boolean;
}) {
  let body: ReactNode = (
    <p className="text-xs leading-relaxed text-muted-foreground">
      点节点看详情：<br />· 点「产业链」「环节」节点可展开/收起该分支；<br />· 点企业查看在招岗位、薪资与展位，并可一键跳到「岗位匹配」定位该单位。
    </p>
  );

  if (sel?.type === "chain") {
    const ch = data.chains.find((c) => c.name === sel.chain);
    if (ch) {
      body = (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: CHAIN_COLORS[data.chains.indexOf(ch) % CHAIN_COLORS.length] }} />
            <h3 className="text-sm font-bold">{ch.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {ch.companies} 家单位 · {ch.positions} 个岗位 · 需求 {num(ch.headcount)} 人{ch.salary ? ` · 月薪 ${sal(ch.salary)} 元` : ""}
          </p>
          <ul className="space-y-1">
            {ch.segments.map((seg) => (
              <li key={seg.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent/40"
                  onClick={() => onSelect({ type: "segment", chain: ch.name, seg: seg.name })}
                >
                  <span className="min-w-0 truncate">{seg.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {seg.companies.length} 家 · {seg.companies.reduce((n, c) => n + c.positions.length, 0)} 岗
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  } else if (sel?.type === "segment") {
    const ch = data.chains.find((c) => c.name === sel.chain);
    const seg = ch?.segments.find((s) => s.name === sel.seg);
    if (ch && seg) {
      const pos = seg.companies.reduce((n, c) => n + c.positions.length, 0);
      const hc = seg.companies.reduce((n, c) => n + (c.headcount ?? 0), 0);
      body = (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">{seg.name}</h3>
          <p className="text-xs text-muted-foreground">
            {ch.name} · <span className="tabular-nums">{seg.companies.length} 家单位 · {pos} 个岗位 · 需求 {num(hc)} 人</span>
          </p>
          <ul className="space-y-1">
            {[...seg.companies]
              .sort((a, b) => b.positions.length - a.positions.length)
              .slice(0, 12)
              .map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent/40"
                    onClick={() => onSelect({ type: "company", chain: ch.name, seg: seg.name, name: c.name })}
                  >
                    <span className="min-w-0 truncate">{c.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {c.positions.length} 岗{c.headcount ? ` · ${c.headcount} 人` : ""}
                    </span>
                  </button>
                </li>
              ))}
            {seg.companies.length > 12 && <li className="px-1 text-[11px] text-muted-foreground">另有 {seg.companies.length - 12} 家，可在节点下展开查看</li>}
          </ul>
        </div>
      );
    }
  } else if (sel?.type === "company") {
    const ch = data.chains.find((c) => c.name === sel.chain);
    const seg = ch?.segments.find((s) => s.name === sel.seg);
    const c = seg?.companies.find((x) => x.name === sel.name);
    if (c) {
      body = (
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold">{c.name}</h3>
              {c.tags.map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px]",
                    t.includes("500强") || t === "上市公司" ? "border-red-500/50 bg-red-50 text-red-700" : "border-emerald-500/50 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ch?.name} · {seg?.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {[c.industry, c.size, c.city].filter(Boolean).join(" · ")}
              {c.booths.length > 0 && <span className="font-medium text-primary"> · 展位 {c.booths.join("/")}</span>}
            </p>
          </div>
          {c.positions.length > 0 ? (
            <div>
              <p className="text-xs font-medium">
                在招岗位（{c.positions.length} 个{c.headcount ? ` · 需求 ${c.headcount} 人` : ""}）
              </p>
              <ul className="mt-1 divide-y divide-border/60 rounded-lg border">
                {c.positions.map((p) => (
                  <li key={p.t} className="flex items-baseline justify-between gap-2 px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 break-words">{p.t}</span>
                    <span className={cn("shrink-0 tabular-nums", p.s ? "font-medium text-amber-700" : "text-muted-foreground")}>{sal(p.s)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg bg-secondary px-2.5 py-2 text-xs text-muted-foreground">未填报具体岗位，可到展位现场咨询。</p>
          )}
          {c.majors.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">需求专业</span>
              {c.majors.map((m) => (
                <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                  {m}
                </span>
              ))}
            </div>
          )}
          {c.intro && <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{c.intro}</p>}
          <div className={cn("flex gap-2", mobile ? "" : "justify-end")}>
            <Button variant="outline" size="sm" className={cn("h-8 gap-1 text-xs", mobile && "w-full")} onClick={() => onGoMatch(c.name)}>
              在岗位匹配中查看这家
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", mobile ? "p-4" : "p-4")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{sel ? "详情" : "使用说明"}</span>
        {mobile && sel && (
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-full p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        )}
      </div>
      {body}
    </div>
  );
}

/* ---------- 树视图主体 ---------- */
export function TreeView({ data, q, onGoMatch }: { data: ChainData; q: string; onGoMatch: (name: string) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedSeg, setExpandedSeg] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const ql = q.trim().toLowerCase();

  const { chainLays, segLays, totalH, rootY } = useMemo(() => buildLayout(data, ql, collapsed, expandedSeg), [data, ql, collapsed, expandedSeg]);
  const matchCount = useMemo(() => countTreeMatches(data, q), [data, q]);

  const toggleCollapse = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const toggleExpand = (key: string) => setExpandedSeg((prev) => (prev === key ? null : key));

  return (
    <div className="mt-4">
      {/* 图例与计数 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border bg-card px-4 py-2.5 text-[11px] text-muted-foreground shadow-sm">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-600" />上市 / 500强</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-600" />校友企业</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400" />其他企业</span>
        <span>圆点大小 = 需求人数</span>
        <span className="ml-auto font-medium text-foreground tabular-nums">
          {ql ? `匹配 ${matchCount} 家单位` : `共 ${data.meta.totals.companies} 家 · ${data.meta.totals.chains} 条产业链`}
        </span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* 树状图 */}
        <div className="overflow-x-auto rounded-xl border bg-card p-2 shadow-sm">
          <svg width={SVG_W} height={totalH} role="img" aria-label="产业链树状图" className="max-w-none" style={{ minWidth: SVG_W }}>
            <style>{`.tvn{cursor:pointer}.tvn:hover{opacity:.82}`}</style>
            {/* 连线：根→链、链→环节、环节→企业 */}
            {chainLays.map((chl) => (
              <path
                key={`e-r-${chl.name}`}
                d={`M ${X_ROOT + W_ROOT},${rootY} C ${(X_ROOT + W_ROOT + X_CHAIN) / 2},${rootY} ${(X_ROOT + W_ROOT + X_CHAIN) / 2},${chl.y} ${X_CHAIN},${chl.y}`}
                fill="none"
                stroke={chl.color}
                strokeWidth={1.6}
                opacity={0.45}
              />
            ))}
            {segLays.map((s) => (
              <path
                key={`e-c-${s.chainName}-${s.name}`}
                d={`M ${X_CHAIN + W_CHAIN},${chainLays.find((c) => c.name === s.chainName)?.y ?? 0} C ${(X_CHAIN + W_CHAIN + X_SEG) / 2},${chainLays.find((c) => c.name === s.chainName)?.y ?? 0} ${(X_CHAIN + W_CHAIN + X_SEG) / 2},${s.y} ${X_SEG},${s.y}`}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                opacity={0.4}
              />
            ))}
            {segLays
              .filter((s) => s.companies.length > 0)
              .map((s) => {
                const spineX = X_SEG + W_SEG + 16;
                const ys = s.companies.map((c) => c.y);
                const minY = Math.min(s.y, ...ys);
                const maxY = Math.max(s.y, ...ys);
                const d = [
                  `M ${X_SEG + W_SEG},${s.y} H ${spineX}`,
                  minY === maxY ? "" : `M ${spineX},${minY} V ${maxY}`,
                  ...ys.map((cy) => `M ${spineX},${cy} H ${X_CO - 9}`),
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <path
                    key={`e-s-${s.chainName}-${s.name}`}
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.3}
                    strokeLinejoin="round"
                    opacity={0.45}
                  />
                );
              })}

            {/* 根节点 */}
            <g className="tvn" onClick={() => setSel(null)}>
              <rect x={X_ROOT} y={rootY - 13} width={W_ROOT} height={26} rx={13} fill="#17593a" />
              <text x={X_ROOT + W_ROOT / 2} y={rootY + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fff">
                招聘会
              </text>
            </g>

            {/* 产业链节点 */}
            {chainLays.map((chl) => (
              <g key={`c-${chl.name}`} className="tvn" onClick={() => toggleCollapse(chl.name)}>
                <rect x={X_CHAIN} y={chl.y - 13} width={W_CHAIN} height={26} rx={13} fill={chl.color} />
                <text x={X_CHAIN + W_CHAIN / 2} y={chl.y + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fff">
                  {trunc(chl.name, 7)}
                </text>
                <title>{`${chl.name}（点击${chl.collapsed ? "展开" : "收起"}）`}</title>
              </g>
            ))}

            {/* 环节节点 */}
            {segLays.map((s) => (
              <g
                key={`s-${s.chainName}-${s.name}`}
                className="tvn"
                onClick={() => {
                  toggleExpand(`${s.chainName}|${s.name}`);
                  setSel({ type: "segment", chain: s.chainName, seg: s.name });
                }}
              >
                <rect x={X_SEG} y={s.y - 13} width={W_SEG} height={26} rx={13} fill="#fff" stroke={s.color} strokeWidth={1.4} />
                <circle cx={X_SEG + 15} cy={s.y} r={3.8} fill="none" stroke={s.color} strokeWidth={1.4} />
                <text x={X_SEG + 26} y={s.y + 4} fontSize={12} fill={s.color}>
                  {trunc(s.name, 9)}
                </text>
                <text x={X_SEG + W_SEG - 11} y={s.y + 4} textAnchor="end" fontSize={10.5} fill="#8395a7">
                  {s.total}家
                </text>
              </g>
            ))}

            {/* 企业节点（展开或搜索命中时） */}
            {segLays.flatMap((s) =>
              s.companies.map(({ c, y }) => {
                const d = dotOf(c);
                const isSel = sel?.type === "company" && sel.name === c.name;
                return (
                  <g
                    key={`co-${s.chainName}-${c.name}`}
                    className="tvn"
                    onClick={() => setSel({ type: "company", chain: s.chainName, seg: s.name, name: c.name })}
                  >
                    <circle cx={X_CO} cy={y} r={d.r} fill={d.color} />
                    <text x={X_CO + 11} y={y + 4} fontSize={12.5} fontWeight={isSel ? 600 : 400} fill={isSel ? "#17593a" : "#26323c"}>
                      {trunc(c.name, 16)}
                      <tspan fill="#8395a7" fontSize={10.5}>{`  · ${c.positions.length}岗`}</tspan>
                    </text>
                    <title>{c.name}</title>
                  </g>
                );
              }),
            )}
          </svg>
        </div>

        {/* 桌面侧栏面板 */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Panel data={data} sel={sel} onSelect={setSel} onGoMatch={onGoMatch} onClose={() => setSel(null)} />
          </div>
        </aside>
      </div>

      {/* 移动端底部详情卡片 */}
      {sel && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[46vh] overflow-y-auto rounded-t-2xl border-t bg-card shadow-[0_-10px_30px_rgba(24,39,58,.16)] lg:hidden">
          <Panel data={data} sel={sel} onSelect={setSel} onGoMatch={onGoMatch} onClose={() => setSel(null)} mobile />
        </div>
      )}

      <footer className="mt-8 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          {data.meta.sourceNote}。{data.meta.privacyNote}
        </p>
        <p className="mt-1">产业链归类为展示性速览（分类与行业字段经人工校准）；点「产业链」节点可收起/展开分支，点「环节」节点展开企业；岗位与薪资以单位填报为准。</p>
      </footer>
    </div>
  );
}
