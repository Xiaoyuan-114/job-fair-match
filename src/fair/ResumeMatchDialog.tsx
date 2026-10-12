import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { analyzeResume, buildAdvice, type ResumeProfile } from "./resume";
import { extractDocxText, extractPdfText } from "./resumeFile";
import { DIRECTIONS, MAJOR_ALL, SALARY_STEPS, type Criteria, type Degree, type MatchInfo } from "./matching";
import { BoothStamp, ReasonChip } from "./CompanyCard";
import { FileUp, Sparkles, Star, X } from "lucide-react";

type Analyzed = { profile: ResumeProfile };

/* 可编辑的识别结果 */
type EditState = {
  major: string;
  degree: Degree;
  intents: string[];
  skills: string[];
  salaryFloor: number | null;
};

const DEGREES: Degree[] = ["本科", "硕士", "不限"];
const DEGREE_LABEL: Record<Degree, string> = { 本科: "本科生", 硕士: "研究生", 不限: "不限学历" };

function EditChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function ResumeMatchDialog({
  open,
  onClose,
  onApply,
  favoriteNames,
  onAddFavorites,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (criteria: Criteria) => void;
  favoriteNames: Set<string>;
  onAddFavorites: (names: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [analyzed, setAnalyzed] = useState<Analyzed | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [parseState, setParseState] = useState<{ status: "idle" | "parsing" | "error"; message?: string }>({ status: "idle" });

  const runAnalyze = (sourceText: string) => {
    const profile = analyzeResume(sourceText);
    setAnalyzed({ profile });
    setEdit({
      major: profile.major ?? "",
      degree: profile.degree ?? "本科",
      intents: [...profile.intents],
      skills: [...profile.skills],
      salaryFloor: profile.salaryFloor,
    });
  };

  const handleAnalyze = () => runAnalyze(text);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    setParseState({ status: "parsing" });
    try {
      let extracted = "";
      if (lower.endsWith(".pdf")) {
        extracted = await extractPdfText(file);
      } else if (lower.endsWith(".docx")) {
        extracted = await extractDocxText(file);
      } else if (lower.endsWith(".doc")) {
        setParseState({ status: "error", message: "旧版 .doc 无法在浏览器内解析：请在 Word 里另存为 .docx，或直接把文字粘贴到文本框。" });
        return;
      } else {
        setParseState({ status: "error", message: "暂只支持 PDF / Word（.docx）文件，其他格式请直接粘贴文字。" });
        return;
      }
      const clean = extracted.trim();
      if (clean.length < 20) {
        setParseState({ status: "error", message: "没有从文件里读到文字（可能是扫描版或图片版 PDF），请直接粘贴简历文字。" });
        return;
      }
      const capped = clean.slice(0, 20000);
      setText(capped);
      setParseState({ status: "idle" });
      runAnalyze(capped);
    } catch {
      setParseState({ status: "error", message: "文件解析失败，请重试或直接粘贴简历文字。" });
    }
  };

  const resetTo = () => {
    setAnalyzed(null);
    setEdit(null);
    setSkillInput("");
  };

  const handleClose = () => {
    resetTo();
    setParseState({ status: "idle" });
    onClose();
  };

  /* 修改后的条件与建议实时联动 */
  const editedCriteria: Criteria | null = useMemo(() => {
    if (!edit) return null;
    return {
      major: edit.major.trim(),
      degree: edit.degree,
      skills: edit.skills,
      jobIntent: edit.intents,
      salaryFloor: edit.salaryFloor,
      regions: [],
      industries: [],
      sizes: [],
      tags: [],
      keyword: "",
    };
  }, [edit]);

  const advice = useMemo(() => {
    if (!analyzed || !editedCriteria || !edit) return null;
    const profile2: ResumeProfile = {
      ...analyzed.profile,
      major: edit.major.trim() || null,
      degree: edit.degree,
      skills: edit.skills,
      intents: edit.intents,
      salaryFloor: edit.salaryFloor,
    };
    return buildAdvice(profile2, editedCriteria);
  }, [analyzed, editedCriteria, edit]);

  const handleApply = () => {
    if (!editedCriteria) return;
    onApply(editedCriteria);
    resetTo();
  };

  const toggleIntent = (id: string) =>
    setEdit((prev) => (prev ? { ...prev, intents: prev.intents.includes(id) ? prev.intents.filter((x) => x !== id) : [...prev.intents, id] } : prev));

  const removeSkill = (s: string) => setEdit((prev) => (prev ? { ...prev, skills: prev.skills.filter((x) => x !== s) } : prev));

  const addSkills = () => {
    const parts = skillInput.split(/[，,、\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setEdit((prev) => (prev ? { ...prev, skills: [...new Set([...prev.skills, ...parts])] } : prev));
    setSkillInput("");
  };

  const recs: MatchInfo[] = advice?.recommendations ?? [];
  const allFaved = recs.length > 0 && recs.every((r) => favoriteNames.has(r.company.name));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            粘贴简历，自动匹配并给建议
          </DialogTitle>
          <DialogDescription className="text-xs">
            上传 PDF / Word 简历，或把简历文字粘贴到下面；识别结果可直接修改，建议与推荐会跟着实时更新。
          </DialogDescription>
        </DialogHeader>

        {!analyzed || !edit ? (
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium shadow-xs transition-colors hover:border-primary/50 hover:text-primary",
                    parseState.status === "parsing" && "pointer-events-none opacity-60",
                  )}
                >
                  <FileUp className="size-3.5" />
                  {parseState.status === "parsing" ? "正在解析文件…" : "上传 PDF / Word 简历"}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="sr-only"
                    aria-label="上传 PDF 或 Word 简历"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void handleFile(f);
                    }}
                  />
                </label>
                <span className="text-[11px] text-muted-foreground">支持拖拽文件，或直接粘贴文字</span>
              </div>
              <Textarea
                name="resume-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"示例：\n浙江农林大学 本科 计算机科学与技术专业\n熟悉 Python、SQL，做过数据分析项目\n期望月薪 8000 以上，希望在杭州工作"}
                className="min-h-40 text-sm"
              />
            </div>
            {parseState.status === "error" && <p className="text-xs text-amber-700">{parseState.message}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">简历文字与文件都只在本机浏览器内解析，不上传、不保存。</p>
              <Button onClick={handleAnalyze} disabled={text.trim().length < 20} className="shrink-0">
                开始分析
              </Button>
            </div>
            {text.trim().length > 0 && text.trim().length < 20 && (
              <p className="text-xs text-amber-700">内容太少，至少粘贴一段完整的教育背景或经历（20 字以上）。</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 可编辑的识别结果 */}
            <section className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="text-xs font-medium">识别结果（可直接修改）</p>
                <p className="text-[11px] text-muted-foreground">改动即时生效，用于匹配与建议</p>
              </div>

              <div className="mt-2 space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-muted-foreground">专业</span>
                    <Input
                      list="resume-major-options"
                      name="resume-major"
                      value={edit.major}
                      onChange={(e) => setEdit({ ...edit, major: e.target.value })}
                      placeholder="未识别到，可手动填写"
                      className="h-9 bg-card"
                    />
                    <datalist id="resume-major-options">
                      {MAJOR_ALL.map((m) => (
                        <option key={m.name} value={m.name} />
                      ))}
                    </datalist>
                  </label>
                  <div>
                    <span className="mb-1 block text-[11px] text-muted-foreground">学历</span>
                    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                      {DEGREES.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={edit.degree === d}
                          onClick={() => setEdit({ ...edit, degree: d })}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs transition-colors",
                            edit.degree === d ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {DEGREE_LABEL[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-muted-foreground">期望岗位（点选增减）</span>
                  <div className="flex flex-wrap gap-1.5">
                    {DIRECTIONS.map((d) => (
                      <EditChip key={d.id} label={d.label} selected={edit.intents.includes(d.id)} onClick={() => toggleIntent(d.id)} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <span className="mb-1 block text-[11px] text-muted-foreground">技能（点 × 移除；可补充）</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {edit.skills.map((s) => (
                        <span key={s} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pr-1 pl-2 text-xs text-primary">
                          {s}
                          <button
                            type="button"
                            aria-label={`移除技能 ${s}`}
                            onClick={() => removeSkill(s)}
                            className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      {edit.skills.length === 0 && <span className="text-[11px] text-muted-foreground">未识别到技能，可补充</span>}
                      <input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "，") {
                            e.preventDefault();
                            addSkills();
                          }
                        }}
                        onBlur={addSkills}
                        placeholder="+ 补充技能"
                        aria-label="补充技能"
                        className="h-7 w-24 rounded-full border border-dashed border-border bg-transparent px-2.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] text-muted-foreground">期望月薪下限</span>
                    <NativeSelect
                      name="resume-salary"
                      value={edit.salaryFloor === null ? "" : String(edit.salaryFloor)}
                      onChange={(e) => setEdit({ ...edit, salaryFloor: e.target.value === "" ? null : Number(e.target.value) })}
                      className="h-9 min-w-40"
                      aria-label="期望月薪下限"
                    >
                      <NativeSelectOption value="">不限</NativeSelectOption>
                      {SALARY_STEPS.map((s) => (
                        <NativeSelectOption key={s} value={String(s)}>{`${s.toLocaleString("zh-CN")} 元以上`}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>
            </section>

            {/* 针对性建议（随修改实时更新） */}
            {advice && (
              <section className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">针对性建议</p>
                <ul className="space-y-1.5">
                  {advice.notes.map((n, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.tone === "good" ? "bg-emerald-500" : n.tone === "warn" ? "bg-amber-500" : "bg-sky-500")} />
                      <span className="text-foreground/85">{n.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recs.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">推荐优先走访（按匹配度）</p>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onAddFavorites(recs.map((r) => r.company.name))} disabled={allFaved}>
                    {allFaved ? "已全部收藏" : "全部加入收藏"}
                  </Button>
                </div>
                <ul className="space-y-1.5">
                  {recs.map((m) => {
                    const fav = favoriteNames.has(m.company.name);
                    return (
                      <li key={m.company.id} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <BoothStamp booths={m.company.booths} />
                            <span className="text-sm font-medium break-words">{m.company.name}</span>
                            {m.pct !== null && <span className="text-xs font-semibold text-primary tabular-nums">{m.pct}%</span>}
                          </div>
                          {m.reasons.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {m.reasons.slice(0, 3).map((r) => (
                                <ReasonChip key={r.label} label={r.label} tone={r.tone} />
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddFavorites(fav ? [] : [m.company.name])}
                          aria-pressed={fav}
                          aria-label={fav ? `取消收藏 ${m.company.name}` : `收藏 ${m.company.name}`}
                          className="rounded-full p-1.5 transition-colors hover:bg-accent"
                        >
                          <Star className={cn("size-4", fav ? "fill-amber-400 text-amber-500" : "text-muted-foreground/50")} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <Button variant="ghost" size="sm" onClick={resetTo}>
                重新输入
              </Button>
              <Button onClick={handleApply}>应用条件并查看结果</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
