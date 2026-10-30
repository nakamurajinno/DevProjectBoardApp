"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/Floating";
import { categoryLabel } from "@/lib/constants";
import type { ProjectWithProgress } from "@/types";
import { HoursProgress } from "./HoursProgress";
import { ProjectTableHead } from "./ProjectTableHead";
import { RowActions } from "./RowActions";
import { StatusBadge } from "./StatusBadge";

export function ProjectTableView({
  projects,
}: {
  projects: ProjectWithProgress[];
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  return (
    <table className="w-full min-w-[860px] table-fixed">
      <colgroup>
        <col className="w-14" />
        <col className="w-24" />
        <col className="w-52" />
        <col />
        <col className="w-36" />
        <col className="w-40" />
        <col className="w-28" />
      </colgroup>
      <ProjectTableHead />
      <tbody>
        {projects.length === 0 && (
          <tr>
            <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
              プロジェクトがありません。「+ Add Project」から登録してください。
            </td>
          </tr>
        )}
        {projects.map((project, index) => (
          <tr
            key={project.id}
            onClick={() => router.push(`/projects/${project.id}`)}
            className={`group cursor-pointer border-b border-gray-300 text-sm transition-colors hover:bg-row-active/60 ${
              params.id === project.id ? "bg-row-active" : ""
            }`}
          >
            <td className="px-3 py-4 text-center">{index + 1}</td>
            <td className="px-3 py-4 text-center">
              <StatusBadge status={project.status} />
            </td>
            <td className="truncate px-3 py-4">
              <Link
                href={`/projects/${project.id}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {project.name}
              </Link>
            </td>
            <td className="px-3 py-4">
              <Tooltip content={project.summary} focusable className="block truncate">
                {project.summary}
              </Tooltip>
            </td>
            <td className="px-3 py-4 text-center">
              {categoryLabel(project.category)}
            </td>
            <td className="px-3 py-3">
              <HoursProgress
                actual={project.actual_hours}
                planned={project.planned_hours}
              />
            </td>
            <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
              <RowActions project={project} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
