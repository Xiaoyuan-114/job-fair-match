import { useCallback, useEffect, useState } from "react";

// 按单位名存储（比 id 更稳：数据重新生成时 id 会变，名称相对稳定）
const STORAGE_KEY = "job-fair-favorites-v1";

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [names, setNames] = useState<Set<string>>(() => new Set(readStored()));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...names]));
    } catch {
      // 隐私模式等场景下写入失败时静默降级为本会话内有效
    }
  }, [names]);

  const toggle = useCallback((name: string) => {
    setNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const addMany = useCallback((items: string[]) => {
    setNames((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const n of items) {
        if (!next.has(n)) {
          next.add(n);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  return { names, toggle, addMany };
}
