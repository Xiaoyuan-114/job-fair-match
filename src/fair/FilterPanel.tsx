import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  DIRECTION_OPTIONS,
  INDUSTRY_OPTIONS,
  MAJOR_ALL,
  MAJOR_HOT,
  REGION_OPTIONS,
  SALARY_STEPS,
  SIZE_OPTIONS,
  TAG_OPTIONS,
  type Criteria,
  type Degree,
} from "./matching";
import { RotateCcw, Sparkles } from "lucide-react";

function Chip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-xs"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && <span className={cn("tabular-nums", selected ? "text-primary-foreground/75" : "text-muted-foreground/70")}>{count}</span>}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{children}</span>;
}

const DEGREES: Degree[] = ["本科", "硕士", "不限"];
const DEGREE_LABEL: Record<Degree, string> = { 本科: "本科生", 硕士: "研究生", 不限: "不限学历" };

export function FilterPanel({
  criteria,
  onChange,
  onReset,
  onOpenResume,
  active,
}: {
  criteria: Criteria;
  onChange: (patch: Partial<Criteria>) => void;
  onReset: () => void;
  onOpenResume: () => void;
  active: boolean;
}) {
  const toggle = <K extends "regions" | "industries" | "sizes" | "tags" | "jobIntent">(key: K, value: string) => {
    const list = criteria[key];
    onChange({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] } as Partial<Criteria>);
  };

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-sm font-semibold">我的求职条件</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenResume}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Sparkles className="size-3.5" />
            粘贴简历匹配
          </button>
          {active && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              清空条件
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {criteria.skills.length > 0 && (
          <div className="sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              简历技能（参与匹配）
              <button
                type="button"
                onClick={() => onChange({ skills: [] })}
                className="text-muted-foreground/80 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                清除
              </button>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {criteria.skills.map((s) => (
                <span key={s} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block">
            <FieldLabel>我的专业</FieldLabel>
            <Input
              list="major-options"
              name="major"
              value={criteria.major}
              onChange={(e) => onChange({ major: e.target.value })}
              placeholder="输入专业名称，或点下方热门专业"
              className="h-10 bg-card"
            />
            <datalist id="major-options">
              {MAJOR_ALL.map((m) => (
                <option key={m.name} value={m.name}>{`${m.count} 家单位需求`}</option>
              ))}
            </datalist>
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MAJOR_HOT.map((m) => (
              <Chip
                key={m.name}
                label={m.name}
                selected={criteria.major.trim() === m.name}
                onClick={() => onChange({ major: criteria.major.trim() === m.name ? "" : m.name })}
              />
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">我的学历</legend>
          <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
            {DEGREES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={criteria.degree === d}
                onClick={() => onChange({ degree: d })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  criteria.degree === d ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {DEGREE_LABEL[d]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <FieldLabel>期望月薪下限</FieldLabel>
          <NativeSelect
            name="salary-floor"
            value={criteria.salaryFloor === null ? "" : String(criteria.salaryFloor)}
            onChange={(e) => onChange({ salaryFloor: e.target.value === "" ? null : Number(e.target.value) })}
            className="h-10 min-w-56"
            aria-label="期望月薪下限"
          >
            <NativeSelectOption value="">不限</NativeSelectOption>
            {SALARY_STEPS.map((s) => (
              <NativeSelectOption key={s} value={String(s)}>{`${s.toLocaleString("zh-CN")} 元以上`}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            期望岗位（可多选，与在招岗位方向比对）
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {DIRECTION_OPTIONS.map((d) => (
              <Chip key={d.id} label={d.label} count={d.count} selected={criteria.jobIntent.includes(d.id)} onClick={() => toggle("jobIntent", d.id)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">意向地区</legend>
          <div className="flex flex-wrap gap-1.5">
            {REGION_OPTIONS.map((r) => (
              <Chip key={r.key} label={r.label} count={r.count} selected={criteria.regions.includes(r.key)} onClick={() => toggle("regions", r.key)} />
            ))}
          </div>
        </fieldset>
      </div>

      <details className="group mt-4 border-t pt-3">
        <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          更多筛选（行业 / 规模 / 单位标签）
          <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-3 space-y-3">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">单位行业</legend>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_OPTIONS.map((i) => (
                <Chip key={i.name} label={i.name} count={i.count} selected={criteria.industries.includes(i.name)} onClick={() => toggle("industries", i.name)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">单位规模</legend>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_OPTIONS.map((s) => (
                <Chip key={s.name} label={s.name} count={s.count} selected={criteria.sizes.includes(s.name)} onClick={() => toggle("sizes", s.name)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">单位标签</legend>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => (
                <Chip key={t.name} label={t.name} count={t.count} selected={criteria.tags.includes(t.name)} onClick={() => toggle("tags", t.name)} />
              ))}
            </div>
          </fieldset>
        </div>
      </details>
    </section>
  );
}
