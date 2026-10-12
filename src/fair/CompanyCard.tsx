import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtSalary, salaryRange, type MatchInfo, type Tone } from "./matching";
import { MapPin, Star, Users } from "lucide-react";

export function BoothStamp({ booths, size = "md" }: { booths: string[]; size?: "md" | "lg" }) {
  if (!booths.length) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-primary/45 bg-accent font-semibold text-primary",
        size === "md" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
    >
      <MapPin className={size === "md" ? "size-3" : "size-4"} />
      展位 {booths.join(" / ")}
    </span>
  );
}

export function ScoreBadge({ pct }: { pct: number }) {
  const tier = pct >= 75 ? "high" : pct >= 50 ? "mid" : "low";
  return (
    <span
      className={cn(
        "flex shrink-0 flex-col items-center rounded-lg px-2.5 py-1.5 leading-none",
        tier === "high" && "bg-primary text-primary-foreground",
        tier === "mid" && "bg-amber-400/20 text-amber-900",
        tier === "low" && "bg-secondary text-secondary-foreground",
      )}
    >
      <span className="text-base font-bold tabular-nums">{pct}%</span>
      <span className="mt-0.5 text-[10px] opacity-85">{tier === "high" ? "高度匹配" : tier === "mid" ? "较为匹配" : "一般匹配"}</span>
    </span>
  );
}

export function ReasonChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "strong" && "bg-primary/10 text-primary",
        tone === "mild" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "info" && "bg-sky-100 text-sky-800",
      )}
    >
      {label}
    </span>
  );
}

export function TagBadge({ tag }: { tag: string }) {
  const featured = tag === "校友企业" || tag.includes("500强");
  return (
    <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", featured ? "border-amber-500/60 bg-amber-50 text-amber-800" : "text-muted-foreground")}>
      {tag}
    </Badge>
  );
}

export function FavoriteStar({ active }: { active: boolean }) {
  return (
    <Star className={cn("size-5 transition-colors", active ? "fill-amber-400 text-amber-500" : "text-muted-foreground/50")} />
  );
}

export function CompanyCard({
  info,
  salaryFloor,
  favorite,
  onToggleFavorite,
  onOpen,
}: {
  info: MatchInfo;
  salaryFloor: number | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  const c = info.company;
  const range = salaryRange(c);
  const shown = [...c.positions]
    .sort((a, b) => {
      if (salaryFloor) {
        const aHit = (a.salaryMax ?? 0) >= salaryFloor ? 1 : 0;
        const bHit = (b.salaryMax ?? 0) >= salaryFloor ? 1 : 0;
        if (aHit !== bHit) return bHit - aHit;
      }
      return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
    })
    .slice(0, 3);

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card shadow-sm transition-all hover:border-primary/45 hover:shadow-md",
        favorite && "border-amber-400/60",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`查看 ${c.name} 详情`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      />
      <div className="pointer-events-none p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 pr-9">
              <h3 className="min-w-0 text-[15px] leading-snug font-semibold break-words">{c.name}</h3>
              {info.pct !== null && <ScoreBadge pct={info.pct} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <BoothStamp booths={c.booths} />
              {c.tags.map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
            {info.reasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {info.reasons.map((r) => (
                  <ReasonChip key={r.label} label={r.label} tone={r.tone} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {c.industry && <span>{c.industry}</span>}
          {c.size && <span>{c.size}</span>}
          {c.location && <span className="truncate">{c.location}</span>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 font-medium">
            <Users className="size-3.5 text-muted-foreground" />
            {c.positions.length > 0 ? `${c.positions.length} 个岗位` : "岗位现场咨询"}
            {c.headcount ? ` · 需求 ${c.headcount} 人` : ""}
          </span>
          {range && (
            <span className="text-muted-foreground">
              薪资 <span className="font-medium text-foreground tabular-nums">{range.min}-{range.max}</span>
            </span>
          )}
        </div>

        {shown.length > 0 && (
          <div className="mt-2.5 space-y-1 border-t border-dashed pt-2.5">
            {shown.map((p) => {
              const hit = salaryFloor !== null && (p.salaryMax ?? 0) >= salaryFloor;
              return (
                <div key={p.title} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-foreground/85">{p.title}</span>
                  <span className={cn("shrink-0 tabular-nums", hit ? "font-medium text-primary" : "text-muted-foreground")}>
                    {hit && <span className="mr-1 rounded-sm bg-primary/10 px-1 py-px text-[10px]">达标</span>}
                    {fmtSalary(p.salaryMin, p.salaryMax)}
                  </span>
                </div>
              );
            })}
            {c.positions.length > shown.length && <div className="text-[11px] text-muted-foreground">另有 {c.positions.length - shown.length} 个岗位，点开查看</div>}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `取消收藏 ${c.name}` : `收藏 ${c.name}`}
        title={favorite ? "取消收藏" : "收藏"}
        className="absolute top-2.5 right-2.5 z-20 rounded-full p-2 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <FavoriteStar active={favorite} />
      </button>
    </div>
  );
}
