"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { EMPTY_FILTER, filterProjects, isFilterActive, type ProjectFilter } from "@/lib/projectFilter";
import type { ProjectWithProgress } from "@/types";

// 一覧の 1 行分。No. は絞り込み前の並び順の番号を維持する
export type NumberedProject = { project: ProjectWithProgress; no: number };

// 一覧の検索・絞り込み。検索条件はローカル state で持ち、入力のたびに一覧を絞り込む
// (入力欄の反応を優先するため、絞り込み処理は useDeferredValue で遅延させる)
export function useProjectFilter(projects: ProjectWithProgress[]) {
  const [filter, setFilter] = useState<ProjectFilter>(EMPTY_FILTER);
  const deferredFilter = useDeferredValue(filter);

  const numbered = useMemo<NumberedProject[]>(
    () => projects.map((project, index) => ({ project, no: index + 1 })),
    [projects],
  );
  const rows = useMemo(() => {
    const matched = new Set(filterProjects(projects, deferredFilter).map((p) => p.id));
    return numbered.filter(({ project }) => matched.has(project.id));
  }, [projects, numbered, deferredFilter]);

  return {
    filter,
    setFilter,
    rows,
    total: projects.length,
    isFiltered: isFilterActive(deferredFilter),
  };
}
