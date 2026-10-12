import { useEffect, useMemo, useState } from "react";
import { FilterPanel } from "./fair/FilterPanel";
import { CompanyCard } from "./fair/CompanyCard";
import { CompanyDetail } from "./fair/CompanyDetail";
import { ResumeMatchDialog } from "./fair/ResumeMatchDialog";
import { FavoritesToolbar } from "./fair/FavoritesToolbar";
import { ChainHub } from "./chain/ChainHub";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { emptyCriteria, fair, hasCriteria, runMatch, type Criteria, type MatchInfo, type SortKey } from "./fair/matching";
import { useFavorites } from "./fair/useFavorites";
import { cn } from "@/lib/utils";

const BATCH = 48;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "match", label: "匹配度优先" },
  { value: "booth", label: "按展位号" },
  { value: "salary", label: "薪资从高到低" },
  { value: "headcount", label: "需求人数多" },
];

export default function App() {
  const [criteria, setCriteria] = useState<Criteria>(emptyCriteria);
  const [sort, setSort] = useState<SortKey>("match");
  const [selected, setSelected] = useState<MatchInfo | null>(null);
  const [visible, setVisible] = useState(BATCH);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [view, setView] = useState<"match" | "chain">(() =>
    typeof window !== "undefined" && window.location.hash === "#chain" ? "chain" : "match",
  );
  const { names: favoriteNames, toggle: toggleFavorite, addMany: addFavorites } = useFavorites();

  const go = (v: "match" | "chain") => {
    setView(v);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", v === "chain" ? "#chain" : window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const onHash = () => setView(window.location.hash === "#chain" ? "chain" : "match");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goMatch = (name: string) => {
    setCriteria({ ...emptyCriteria, keyword: name });
    setSort("match");
    setFavoritesOnly(false);
    go("match");
    requestAnimationFrame(() => {
      document.getElementById("results-bar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const applyResumeCriteria = (next: Criteria) => {
    setCriteria(next);
    setSort("match");
    setFavoritesOnly(false);
    requestAnimationFrame(() => {
      document.getElementById("results-bar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const patch = (p: Partial<Criteria>) => setCriteria((prev) => ({ ...prev, ...p }));
  const reset = () => {
    setCriteria(emptyCriteria);
    setSort("match");
  };

  const results = useMemo(
    () => runMatch(criteria, sort, { favoriteNames, favoritesOnly }),
    [criteria, sort, favoriteNames, favoritesOnly],
  );
  useEffect(() => setVisible(BATCH), [criteria, sort, favoritesOnly]);
  const active = hasCriteria(criteria);
  const meta = fair.meta;
  const hiddenFavorites = favoritesOnly ? Math.max(0, favoriteNames.size - results.length) : 0;

  return (
    <div className="min-h-dvh">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <p className="text-xs tracking-widest text-primary-foreground/70">校园招聘会 · 参会单位速查</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">岗位匹配助手</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
            {view === "match"
              ? "填上你的专业、学历与期望月薪，单位按匹配度排序；看中的单位记下展位号，现场直接去聊。"
              : "按产业链浏览参会单位：看结构、找对口链条，点开单位可一键跳回岗位匹配。"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/12 px-2.5 py-1 tabular-nums">{meta.totalCompanies} 家单位</span>
            <span className="rounded-full bg-white/12 px-2.5 py-1 tabular-nums">{meta.totalPositions} 个岗位</span>
            <span className="rounded-full bg-white/12 px-2.5 py-1 tabular-nums">需求 {meta.totalHeadcount.toLocaleString("zh-CN")} 人</span>
            <span className="rounded-full bg-white/12 px-2.5 py-1">审核通过单位</span>
          </div>
          <nav className="mt-4 flex gap-2" aria-label="站点视图">
            {([
              ["match", "岗位匹配"],
              ["chain", "产业链"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                aria-current={view === key ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  view === key
                    ? "bg-white font-semibold text-primary shadow-sm"
                    : "border border-white/35 bg-white/10 text-white/90 hover:bg-white/20",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {view === "chain" ? (
          <ChainHub onGoMatch={goMatch} />
        ) : (
          <>
        <div className="-mt-4 sm:-mt-5">
          <FilterPanel criteria={criteria} onChange={patch} onReset={reset} onOpenResume={() => setResumeOpen(true)} active={active} />
        </div>

        <div id="results-bar" className="sticky top-0 z-20 -mx-4 mt-4 scroll-mt-2 border-b bg-background/90 px-4 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium" aria-live="polite">
              {favoritesOnly ? (
                <>
                  我的收藏 <span className="text-primary tabular-nums">{results.length}</span> 家
                  {hiddenFavorites > 0 && <span className="text-muted-foreground"> / 共收藏 {favoriteNames.size} 家</span>}
                </>
              ) : active ? (
                <>
                  符合条件 <span className="text-primary tabular-nums">{results.length}</span> 家
                  <span className="text-muted-foreground"> / 共 {meta.totalCompanies} 家</span>
                </>
              ) : (
                <>
                  共 <span className="tabular-nums">{meta.totalCompanies}</span> 家单位
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                favoritesOnly
                  ? "border-amber-400 bg-amber-50 font-medium text-amber-900"
                  : "border-border bg-card text-muted-foreground hover:border-amber-400/60 hover:text-foreground",
              )}
            >
              <Star
                className={cn(
                  "size-3.5",
                  favoritesOnly ? "fill-amber-400 text-amber-500" : favoriteNames.size > 0 ? "fill-amber-400/70 text-amber-500/80" : "",
                )}
              />
              我的收藏
              {favoriteNames.size > 0 && <span className="tabular-nums">{favoriteNames.size}</span>}
            </button>
            <div className="ml-auto flex flex-1 items-center gap-2 sm:flex-none">
              <div className="relative flex-1 sm:w-56 sm:flex-none">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="keyword"
                  value={criteria.keyword}
                  onChange={(e) => patch({ keyword: e.target.value })}
                  placeholder="搜索单位 / 岗位关键词"
                  aria-label="搜索单位或岗位关键词"
                  className="h-9 bg-card pl-8"
                />
              </div>
              <NativeSelect
                name="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-w-32 shrink-0 bg-card"
                aria-label="排序方式"
              >
                {SORT_OPTIONS.map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>

        {favoritesOnly && <FavoritesToolbar names={favoriteNames} />}

        {favoritesOnly && hiddenFavorites > 0 && results.length > 0 && (
          <p className="mt-3 rounded-lg border border-dashed bg-card px-3 py-2 text-xs text-muted-foreground">
            另有 {hiddenFavorites} 家收藏被当前条件筛除。
            <button type="button" onClick={reset} className="ml-1 font-medium text-primary hover:underline">
              清除筛选条件
            </button>
          </p>
        )}

        {results.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            {favoritesOnly ? (
              favoriteNames.size === 0 ? (
                <>
                  <Star className="size-8 text-muted-foreground" />
                  <p className="max-w-md px-6 text-sm text-muted-foreground">
                    还没有收藏单位。点单位卡片右上角的星标即可收藏，收藏保存在本机浏览器，可作为现场逛展清单。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setFavoritesOnly(false)}>
                    看看全部单位
                  </Button>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">收藏的 {favoriteNames.size} 家单位都不符合当前条件（含搜索关键词）。</p>
                  <Button variant="outline" size="sm" onClick={reset}>
                    清除筛选条件
                  </Button>
                </>
              )
            ) : (
              <>
                <SlidersHorizontal className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">没有符合条件的单位，试试清空或放宽筛选条件。</p>
                <Button variant="outline" size="sm" onClick={reset}>
                  清空条件
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {results.slice(0, visible).map((info) => (
                <CompanyCard
                  key={info.company.id}
                  info={info}
                  salaryFloor={criteria.salaryFloor}
                  favorite={favoriteNames.has(info.company.name)}
                  onToggleFavorite={() => toggleFavorite(info.company.name)}
                  onOpen={() => setSelected(info)}
                />
              ))}
            </div>
            {visible < results.length && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => setVisible((v) => v + BATCH)}>
                  显示更多（还有 {results.length - visible} 家）
                </Button>
              </div>
            )}
          </>
        )}

        <footer className="mt-12 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
          <details>
            <summary className="cursor-pointer font-medium text-foreground/70 hover:text-foreground">匹配规则说明</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>专业：与单位需求专业一致 / 相近 / 相关分别计分，命中的需求专业条目越多加分越多；填报「不限专业」的单位同样保留。</li>
              <li>期望岗位：与单位在招岗位方向吻合时计「岗位方向匹配」（命中多个方向分数更高）；简历里的「求职意向」会自动识别。</li>
              <li>技能（来自简历匹配）：简历中的技能与单位岗位方向吻合时计「技能匹配」加分。</li>
              <li>期望月薪：按单位岗位的达标覆盖率计分（全部或多数岗位达标为满分档），部分岗位达标标「部分岗位达标」。</li>
              <li>地区、行业、规模、单位标签为硬筛选，勾选后只保留符合的单位。</li>
              <li>匹配度 = 已设置维度（专业 42 / 期望岗位 15 / 技能 15 / 行业 15 / 地区 10 / 薪资 25）的加权得分，按已设置维度归一为百分比；同分按单位标签数量与展位号排列。</li>
            </ul>
          </details>
          <p className="mt-3">
            数据来源：招聘会报名系统导出文件（{meta.generatedAt} 更新）。收录审核通过单位 {meta.approvedRows} 家，同名单位合并后为 {meta.totalCompanies} 家；
            审核不通过或已取消报名的 {meta.skippedRows} 条不在此列。岗位、薪资与联系方式以单位填报及现场说明为准。
          </p>
        </footer>
          </>
        )}
      </main>

      <CompanyDetail
        info={selected}
        salaryFloor={criteria.salaryFloor}
        favorite={selected ? favoriteNames.has(selected.company.name) : false}
        onToggleFavorite={() => selected && toggleFavorite(selected.company.name)}
        onClose={() => setSelected(null)}
      />

      <ResumeMatchDialog
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onApply={(next) => {
          setResumeOpen(false);
          applyResumeCriteria(next);
        }}
        favoriteNames={favoriteNames}
        onAddFavorites={(names) => (names.length > 0 ? addFavorites(names) : undefined)}
      />
    </div>
  );
}
