"use client";

import Link from "next/link";
import { Tooltip } from "@/components/ui/Floating";
import type { NumberedProject } from "@/hooks/useProjectFilter";
import { categoryLabel } from "@/lib/constants";
import { HoursProgress } from "./HoursProgress";
import { ProjectTableHead, TABLE_HEADERS, tableContainerClass } from "./ProjectTableHead";
import { RowActions } from "./RowActions";
import { StatusBadge } from "./StatusBadge";

// lg 以上 (デスクトップ) 向けのテーブル一覧
export function ProjectDataTable({
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
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map(({ project, no }) => (
            <tr
              key={project.id}
              onClick={() => onOpen(project.id)}
              className={`group cursor-pointer border-b border-slate-100 text-sm text-slate-700 transition-colors last:border-0 hover:bg-row-active/60 ${
                selectedId === project.id ? "bg-row-active" : ""
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
              <td className="px-4 py-4 text-center text-slate-500">{categoryLabel(project.category)}</td>
              <td className="truncate px-4 py-4 text-center text-slate-500">
                {project.created_by_name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <HoursProgress actual={project.actual_hours} planned={project.planned_hours} />
              </td>
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                {canEdit && <RowActions project={project} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
