"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/Floating";
import { categoryLabel } from "@/lib/constants";
import { EMPTY_FILTER, filterProjects, isFilterActive } from "@/lib/projectFilter";
import type { ProjectWithProgress } from "@/types";
import { HoursProgress } from "./HoursProgress";
import { type AssigneeOption, ProjectSearchBar } from "./ProjectSearchBar";
import { ProjectTableHead, TABLE_HEADERS } from "./ProjectTableHead";
import { RowActions } from "./RowActions";
import { StatusBadge } from "./StatusBadge";

export const tableContainerClass =
  "hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block";

function emptyMessage(canEdit: boolean, filtered: boolean) {
  if (filtered) return "該当するタスクが見つかりません。検索条件を変更してください。";
  return canEdit
    ? "プロジェクトがありません。「+ Add Project」から登録してください。"
    : "プロジェクトがありません。";
}

// lg 未満 (スマートフォン・タブレット) はカード一覧、lg 以上はテーブルで表示する。
// canEdit が false (参照ユーザ) のときは行の操作ボタン (活動ログ入力・編集・削除) を表示しない
export function ProjectTableView({
  projects: allProjects,
  members,
  canEdit,
}: {
  projects: ProjectWithProgress[];
  members: AssigneeOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const open = (id: string) => router.push(`/projects/${id}`);

  // 検索条件はローカル state で持ち、入力のたびに一覧を絞り込む
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const deferredFilter = useDeferredValue(filter);
  const filtered = isFilterActive(deferredFilter);
  // No. は絞り込み前の並び順の番号を維持する
  const numbered = useMemo(
    () => allProjects.map((project, index) => ({ project, no: index + 1 })),
    [allProjects],
  );
  const rows = useMemo(() => {
    const matched = new Set(filterProjects(allProjects, deferredFilter).map((p) => p.id));
    return numbered.filter(({ project }) => matched.has(project.id));
  }, [allProjects, numbered, deferredFilter]);

  return (
    <>
      <ProjectSearchBar
        filter={filter}
        onChange={setFilter}
        members={members}
        total={allProjects.length}
        shown={rows.length}
      />

      {/* モバイル: カード一覧 */}
      <div className="lg:hidden">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
            {emptyMessage(canEdit, filtered)}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ project, no }) => (
              <li key={project.id}>
                <article
                  onClick={() => open(project.id)}
                  className={`flex h-full cursor-pointer flex-col rounded-xl border bg-white p-4 text-sm text-slate-700 shadow-sm transition-colors active:bg-row-active/60 ${
                    params.id === project.id
                      ? "border-accent/40 bg-row-active"
                      : "border-slate-200"
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
                    <p className="mt-2 line-clamp-2 break-words text-slate-500">{project.summary}</p>
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

      {/* デスクトップ: テーブル */}
      <div className={tableContainerClass}>
        <table className="w-full min-w-[960px] table-fixed">
          <colgroup>
            <col className="w-14" />
            <col className="w-24" />
            <col className="w-52" />
            <col />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-40" />
            <col className="w-28" />
          </colgroup>
          <ProjectTableHead />
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="py-16 text-center text-sm text-slate-500">
                  {emptyMessage(canEdit, filtered)}
                </td>
              </tr>
            )}
            {rows.map(({ project, no }) => (
              <tr
                key={project.id}
                onClick={() => open(project.id)}
                className={`group cursor-pointer border-b border-slate-100 text-sm text-slate-700 transition-colors last:border-0 hover:bg-row-active/60 ${
                  params.id === project.id ? "bg-row-active" : ""
                }`}
              >
                <td className="px-4 py-4 text-center text-xs tabular-nums text-slate-400">{no}</td>
                <td className="px-4 py-4 text-center">
                  <StatusBadge status={project.status} />
                </td>
                <td className="truncate px-4 py-4 font-medium text-slate-900">
                  <Link
                    href={`/projects/${project.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  <Tooltip content={project.summary} focusable className="block truncate">
                    {project.summary}
                  </Tooltip>
                </td>
                <td className="px-4 py-4 text-center text-slate-500">
                  {categoryLabel(project.category)}
                </td>
                <td className="truncate px-4 py-4 text-center text-slate-500">
                  {project.created_by_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <HoursProgress
                    actual={project.actual_hours}
                    planned={project.planned_hours}
                  />
                </td>
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  {canEdit && <RowActions project={project} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
