"use client";

import { Search, X } from "lucide-react";
import { inputClass, Select, type SelectOption } from "@/components/ui/form";
import { isProjectStatus, STATUS_OPTIONS } from "@/lib/constants";
import {
  ASSIGNEE_ALL,
  ASSIGNEE_UNASSIGNED,
  EMPTY_FILTER,
  isFilterActive,
  type ProjectFilter,
} from "@/lib/projectFilter";
import type { AssigneeOption } from "@/types";

const STATUS_FILTER_OPTIONS: SelectOption<ProjectFilter["status"]>[] = [
  { value: "all", label: "すべて" },
  ...STATUS_OPTIONS,
];

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
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={filter.status}
            onChange={(e) => {
              const status = e.target.value;
              set({ status: isProjectStatus(status) ? status : "all" });
            }}
            aria-label="ステータスで絞り込み"
            className="sm:w-36"
          />
          <Select
            options={[
              { value: ASSIGNEE_ALL, label: "全員" },
              { value: ASSIGNEE_UNASSIGNED, label: "未割り当て" },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
            value={filter.assignee}
            onChange={(e) => set({ assignee: e.target.value })}
            aria-label="担当者で絞り込み"
            className="sm:w-44"
          />
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
