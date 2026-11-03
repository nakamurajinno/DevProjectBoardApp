"use client";

import { Search, X } from "lucide-react";
import { inputClass } from "@/components/ui/form";
import { STATUS_OPTIONS } from "@/lib/constants";
import {
  ASSIGNEE_ALL,
  ASSIGNEE_UNASSIGNED,
  EMPTY_FILTER,
  isFilterActive,
  type ProjectFilter,
} from "@/lib/projectFilter";
import type { ProjectStatus } from "@/types";

export type AssigneeOption = { id: string; name: string };

// 一覧上部の検索バー (キーワード・ステータス・担当者) と件数表示
export function ProjectSearchBar({
  filter,
  onChange,
  members,
  total,
  shown,
}: {
  filter: ProjectFilter;
  onChange: (filter: ProjectFilter) => void;
  members: AssigneeOption[];
  total: number;
  shown: number;
}) {
  const active = isFilterActive(filter);
  const set = (patch: Partial<ProjectFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="mb-4 space-y-2" role="search">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={filter.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            placeholder="タスク名・概要で検索..."
            aria-label="タスク名・概要で検索"
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            value={filter.status}
            onChange={(e) => set({ status: e.target.value as ProjectStatus | "all" })}
            aria-label="ステータスで絞り込み"
            className={`${inputClass} sm:w-36`}
          >
            <option value="all">すべて</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filter.assignee}
            onChange={(e) => set({ assignee: e.target.value })}
            aria-label="担当者で絞り込み"
            className={`${inputClass} sm:w-44`}
          >
            <option value={ASSIGNEE_ALL}>全員</option>
            <option value={ASSIGNEE_UNASSIGNED}>未割り当て</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex min-h-7 items-center justify-between gap-3 text-xs text-slate-500">
        <p aria-live="polite">
          全 <span className="tabular-nums">{total}</span> 件中{" "}
          <span className="font-medium tabular-nums text-slate-700">{shown}</span> 件を表示
        </p>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-3.5" aria-hidden />
            検索条件をクリア
          </button>
        )}
      </div>
    </div>
  );
}
