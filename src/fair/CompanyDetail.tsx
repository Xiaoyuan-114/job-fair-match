import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fmtCapital, fmtSalary, type MatchInfo } from "./matching";
import { BoothStamp, ReasonChip, ScoreBadge, TagBadge } from "./CompanyCard";
import { Briefcase, GraduationCap, Mail, MapPin, Phone, Star, User } from "lucide-react";

function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
      {icon}
      {children}
    </h3>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

const DEGREE_LABEL: Record<string, string> = { 本科: "面向本科生", 硕士: "面向研究生", "": "专业要求（未标注学历）" };

export function CompanyDetail({
  info,
  salaryFloor,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  info: MatchInfo | null;
  salaryFloor: number | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const [introExpanded, setIntroExpanded] = useState(false);
  if (!info) return null;
  const c = info.company;

  const degreeGroups = new Map<string, string[]>();
  for (const m of c.majors) {
    const list = degreeGroups.get(m.degree) ?? [];
    list.push(m.name);
    degreeGroups.set(m.degree, list);
  }
  const degreeOrder = ["本科", "硕士", ""].filter((d) => degreeGroups.has(d));

  const sortedPositions = [...c.positions];
  const introLong = c.intro.length > 220;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-card p-5 pr-12 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <DialogTitle className="min-w-0 flex-1 text-lg leading-snug font-bold">{c.name}</DialogTitle>
            <div className="flex shrink-0 items-center gap-2">
              {info.pct !== null && <ScoreBadge pct={info.pct} />}
              <Button
                type="button"
                size="sm"
                variant={favorite ? "default" : "outline"}
                onClick={onToggleFavorite}
                aria-pressed={favorite}
                className={cn("gap-1.5", favorite && "bg-amber-500 text-white hover:bg-amber-500/90")}
              >
                <Star className={cn("size-4", favorite && "fill-current")} />
                {favorite ? "已收藏" : "收藏"}
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <BoothStamp booths={c.booths} size="lg" />
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
          <DialogDescription className="mt-2 text-xs">
            {[c.industry, c.size, c.location].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-9rem)] space-y-5 overflow-y-auto p-5">
          <section className="space-y-2">
            <SectionTitle icon={<Briefcase className="size-4 text-muted-foreground" />}>
              岗位与薪资（元/月）
              <span className="text-xs font-normal text-muted-foreground">
                共 {c.positions.length} 个岗位{c.headcount ? ` · 需求 ${c.headcount} 人` : ""}
              </span>
            </SectionTitle>
            {c.positions.length === 0 ? (
              <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-muted-foreground">该单位未填报具体岗位，请到展位现场咨询。</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {sortedPositions.map((p) => {
                  const hit = salaryFloor !== null && (p.salaryMax ?? 0) >= salaryFloor;
                  return (
                    <li key={p.title} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 break-words">{p.title}</span>
                      <span className={cn("shrink-0 tabular-nums", hit ? "font-medium text-primary" : "text-muted-foreground")}>
                        {fmtSalary(p.salaryMin, p.salaryMax)}
                        {hit && <span className="ml-1.5 rounded-sm bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">达标</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle icon={<GraduationCap className="size-4 text-muted-foreground" />}>需求专业</SectionTitle>
            {c.noLimit && (
              <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">部分岗位不限专业，欢迎各专业同学到展位咨询。</p>
            )}
            {degreeOrder.length === 0 ? (
              <p className="text-sm text-muted-foreground">该单位未填报专业要求。</p>
            ) : (
              <div className="space-y-2">
                {degreeOrder.map((d) => (
                  <div key={d || "none"}>
                    <p className="mb-1 text-xs text-muted-foreground">{DEGREE_LABEL[d] ?? d}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(degreeGroups.get(d) ?? []).map((name) => {
                        const matched = info.major.item === name;
                        return (
                          <span
                            key={name}
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-1 text-xs",
                              matched ? "border-primary bg-primary/10 font-medium text-primary" : "border-border bg-card text-foreground/80",
                            )}
                          >
                            {name}
                            {matched && <span className="ml-1 text-[10px]">你的专业</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle>单位信息</SectionTitle>
            <div className="space-y-1.5 rounded-lg border p-3">
              {c.nature && <InfoRow label="单位性质">{c.nature}</InfoRow>}
              {c.category && <InfoRow label="单位类别">{c.category}</InfoRow>}
              {c.size && <InfoRow label="单位规模">{c.size}</InfoRow>}
              {c.capital !== null && <InfoRow label="注册资金">{fmtCapital(c.capital)}</InfoRow>}
              {c.location && <InfoRow label="所在地">{c.location}</InfoRow>}
              {c.address && <InfoRow label="详细地址">{c.address}</InfoRow>}
              {c.creditCode && <InfoRow label="信用代码">{c.creditCode}</InfoRow>}
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle>联系方式</SectionTitle>
            <div className="space-y-1.5 rounded-lg border p-3">
              {c.contact ? (
                <InfoRow label="联系人">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    {c.contact}
                  </span>
                </InfoRow>
              ) : null}
              {c.phone ? (
                <InfoRow label="联系电话">
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="size-3.5" />
                    <span className="tabular-nums">{c.phone}</span>
                  </a>
                </InfoRow>
              ) : null}
              {c.email ? (
                <InfoRow label="投递邮箱">
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 break-all text-primary hover:underline">
                    <Mail className="size-3.5 shrink-0" />
                    {c.email}
                  </a>
                </InfoRow>
              ) : null}
              {!c.contact && !c.phone && !c.email && <p className="text-sm text-muted-foreground">该单位未填报联系方式。</p>}
            </div>
          </section>

          {c.intro && (
            <section className="space-y-2">
              <SectionTitle>单位介绍</SectionTitle>
              <p className={cn("text-sm leading-relaxed text-foreground/80", !introExpanded && introLong && "line-clamp-5")}>{c.intro}</p>
              {introLong && (
                <button
                  type="button"
                  onClick={() => setIntroExpanded((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {introExpanded ? "收起" : "展开全部"}
                </button>
              )}
            </section>
          )}

          <Separator />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            记好展位号，现场直接找单位
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
