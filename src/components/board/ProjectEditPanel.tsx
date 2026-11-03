"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/form";
import { useProjectEditForm } from "@/hooks/useProjectEditForm";
import type { ActivityLog, ProjectWithProgress } from "@/types";
import { ActivityLogList } from "./ActivityLogList";
import { DetailTabs } from "./DetailTabs";
import { ProjectEditFields } from "./ProjectEditFields";

const FORM_ID = "project-edit-form";

// 詳細編集画面。PJ情報と活動ログの変更をフッターの Save でまとめて保存する
export function ProjectEditPanel({
  project,
  logs: initialLogs,
}: {
  project: ProjectWithProgress;
  logs: ActivityLog[];
}) {
  const form = useProjectEditForm(project, initialLogs);

  return (
    <DetailTabs
      projectId={project.id}
      info={
        <ProjectEditFields
          formId={FORM_ID}
          values={form.values}
          bind={form.bind}
          links={form.links}
          setLinks={form.setLinks}
          errors={form.errors}
          actualHours={project.actual_hours}
          onSubmit={form.handleSubmit}
        />
      }
      logs={<ActivityLogList logs={form.logs} onChange={form.updateLog} onDelete={form.removeLog} />}
      footer={
        <div className="flex items-center justify-end gap-3">
          {form.hasErrors && (
            <p className="mr-auto text-xs text-red-600">{form.message ?? "入力内容を確認してください"}</p>
          )}
          <Link href={`/projects/${project.id}`} onClick={form.reset} className={buttonClass("secondary")}>
            Cancel
          </Link>
          <Button type="submit" form={FORM_ID} disabled={form.pending}>
            {form.pending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    />
  );
}
