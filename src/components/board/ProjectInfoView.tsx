import { ExternalLink } from "lucide-react";
import { Tooltip } from "@/components/ui/Floating";
import { Field, readonlyClass } from "@/components/ui/form";
import { categoryLabel, statusOption } from "@/lib/constants";
import type { ProjectWithProgress } from "@/types";
import { formatHours } from "./HoursProgress";

export function ProjectInfoView({ project }: { project: ProjectWithProgress }) {
  return (
    <div className="space-y-4">
      <Field label="状況">
        <p className={`${readonlyClass} w-fit min-w-24`}>
          {statusOption(project.status).label}
        </p>
      </Field>
      <Field label="アプリ名">
        <p className={readonlyClass}>{project.name}</p>
      </Field>
      <Field label="概要">
        <Tooltip content={project.summary} focusable className="block">
          <p className={`${readonlyClass} min-h-16`}>{project.summary || "—"}</p>
        </Tooltip>
      </Field>
      <Field label="SW区分">
        <p className={`${readonlyClass} w-fit min-w-24`}>
          {categoryLabel(project.category)}
        </p>
      </Field>
      <Field label="工数">
        <p className={`${readonlyClass} w-fit min-w-24`}>
          {formatHours(project.actual_hours)} / {formatHours(project.planned_hours)} h
        </p>
      </Field>
      <Field label="技術構成">
        <p className={readonlyClass}>{project.tech_stack || "—"}</p>
      </Field>
      <Field label="関連リンク">
        {project.links.length === 0 ? (
          <p className={readonlyClass}>—</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-600">
                <th className="w-1/3 py-1.5 font-normal">ラベル</th>
                <th className="py-1.5 font-normal">URL</th>
              </tr>
            </thead>
            <tbody>
              {project.links.map((link) => (
                <tr key={link.id} className="border-b border-gray-200">
                  <td className="truncate py-2 pr-2">{link.label || "—"}</td>
                  <td className="truncate py-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
                    >
                      <span className="truncate">{link.url}</span>
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Field>
      <Field label="スコープ">
        <dl className="space-y-2 text-sm">
          <div className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="pt-2.5">Step1（MVP）:</dt>
            <dd className={readonlyClass}>{project.scope_step1 || "—"}</dd>
          </div>
          <div className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="pt-2.5">Step2（最終）:</dt>
            <dd className={readonlyClass}>{project.scope_step2 || "—"}</dd>
          </div>
        </dl>
      </Field>
    </div>
  );
}
