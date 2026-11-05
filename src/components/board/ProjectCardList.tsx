"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import type { NumberedProject } from "@/hooks/useProjectFilter";
import { categoryLabel } from "@/lib/constants";
import { HoursProgress } from "./HoursProgress";
import { RowActions } from "./RowActions";
import { StatusBadge } from "./StatusBadge";

// lg 未満 (スマートフォン・タブレット) 向けのカード一覧。
// grid-cols-1 (= minmax(0,1fr)) と li の min-w-0 で、長いアプリ名 (truncate) がカード幅を押し広げないようにする
export function ProjectCardList({
  rows,
  selectedId,
  canEdit,
  emptyMessage,
  onOpen,
}: {
  rows: NumberedProject[];
  selectedId?: string;
  canEdit: boolean;
  emptyMessage: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="w-full min-w-0 lg:hidden">
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map(({ project, no }) => (
            <li key={project.id} className="min-w-0">
              <article
                onClick={() => onOpen(project.id)}
                className={`flex h-full cursor-pointer flex-col rounded-xl border bg-white p-4 text-sm text-slate-700 shadow-sm transition-colors active:bg-row-active/60 ${
                  selectedId === project.id ? "border-accent/40 bg-row-active" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-slate-400">No.{no}</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <h2 className="mt-1.5 truncate text-base font-medium text-slate-900">
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.name}
                      </Link>
                    </h2>
                  </div>
                  {canEdit && (
                    <div className="-mr-1 -mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <RowActions project={project} alwaysVisible />
                    </div>
                  )}
                </div>
                {project.summary && (
                  <p className="mt-2 line-clamp-2 wrap-anywhere text-slate-500">{project.summary}</p>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                  <span className="min-w-0 truncate text-xs text-slate-500">
                    {categoryLabel(project.category)}
                    <span className="ml-2 inline-flex items-center gap-0.5" title="登録者">
                      <UserRound className="size-3" aria-label="登録者" />
                      {project.created_by_name ?? "—"}
                    </span>
                  </span>
                  <HoursProgress
                    actual={project.actual_hours}
                    planned={project.planned_hours}
                    className="shrink-0"
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
