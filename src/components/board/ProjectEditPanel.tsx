"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateProject } from "@/app/actions/projects";
import { Button, Field, fullInputClass, inputClass } from "@/components/ui/form";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import type { ProjectFieldErrors } from "@/lib/validation/project";
import type { ActivityLog, ProjectWithProgress } from "@/types";
import { ActivityLogList } from "./ActivityLogList";
import { DetailTabs } from "./DetailTabs";
import { formatHours } from "./HoursProgress";
import { LinksEditor, type LinkDraft } from "./LinksEditor";

const FORM_ID = "project-edit-form";

// 編集モードに入った時点の値。Cancel ではこの値に戻してから参照画面へ遷移する。
function initialDraft(project: ProjectWithProgress, logs: ActivityLog[]) {
  return {
    values: {
      status: project.status,
      name: project.name,
      summary: project.summary,
      category: project.category,
      planned_hours: String(project.planned_hours),
      tech_stack: project.tech_stack,
      scope_step1: project.scope_step1,
      scope_step2: project.scope_step2,
    },
    links: project.links.map(
      ({ id, label, url }): LinkDraft => ({ key: id, label, url }),
    ),
    logs,
  };
}

// cacheComponents では参照画面へ戻ってもこの画面は <Activity> で state ごと保持される。
// Cancel 時に明示的に元の値へ戻さないと、次に Edit を開いたとき破棄したはずの入力が残ってしまう。
export function ProjectEditPanel({
  project,
  logs: initialLogs,
}: {
  project: ProjectWithProgress;
  logs: ActivityLog[];
}) {
  const [initial] = useState(() => initialDraft(project, initialLogs));
  const [values, setValues] = useState(initial.values);
  const [links, setLinks] = useState<LinkDraft[]>(initial.links);
  // 活動ログの編集・削除は Save まで下書きとして保持する
  const [logs, setLogs] = useState(initial.logs);
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setValues(initial.values);
    setLinks(initial.links);
    setLogs(initial.logs);
    setErrors({});
    setMessage(undefined);
  };

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(undefined);
    const ids = new Set(logs.map((log) => log.id));
    startTransition(async () => {
      const result = await updateProject(
        project.id,
        {
          ...values,
          links: links.map(({ label, url }) => ({ label, url })),
        },
        {
          updated: logs
            .filter((log) => !initial.logs.includes(log))
            .map(({ id, project_id, worked_on, hours, content }) => ({
              id,
              input: { project_id, worked_on, hours, content },
            })),
          deleted: initial.logs
            .filter((log) => !ids.has(log.id))
            .map((log) => log.id),
        },
      );
      if (result) {
        setErrors(result.errors);
        setMessage(result.message);
      }
    });
  };

  const info = (
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="状況" htmlFor="status" error={errors.status}>
        <select
          id="status"
          value={values.status}
          onChange={set("status")}
          className={`${inputClass} w-fit min-w-32`}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="アプリ名" htmlFor="name" error={errors.name}>
        <input
          id="name"
          value={values.name}
          onChange={set("name")}
          aria-invalid={!!errors.name}
          required
          className={fullInputClass}
        />
      </Field>
      <Field label="概要" htmlFor="summary" error={errors.summary}>
        <textarea
          id="summary"
          value={values.summary}
          onChange={set("summary")}
          aria-invalid={!!errors.summary}
          rows={3}
          className={fullInputClass}
        />
      </Field>
      <Field label="SW区分" htmlFor="category" error={errors.category}>
        <select
          id="category"
          value={values.category}
          onChange={set("category")}
          className={`${inputClass} w-fit min-w-32`}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="工数" htmlFor="planned_hours" error={errors.planned_hours}>
        <div className="flex items-center gap-2 text-sm">
          <span className="whitespace-nowrap" title="実績工数（活動ログの合計）">
            {formatHours(project.actual_hours)} /
          </span>
          <input
            id="planned_hours"
            type="number"
            min={0}
            step={0.5}
            value={values.planned_hours}
            onChange={set("planned_hours")}
            aria-invalid={!!errors.planned_hours}
            className={`${inputClass} w-24`}
          />
          <span>h</span>
        </div>
      </Field>
      <Field label="技術構成" htmlFor="tech_stack">
        <input
          id="tech_stack"
          value={values.tech_stack}
          onChange={set("tech_stack")}
          placeholder="Next.js/Supabase/Vercel"
          className={fullInputClass}
        />
      </Field>
      <Field label="関連リンク" error={errors.links}>
        <LinksEditor links={links} setLinks={setLinks} />
      </Field>
      <Field label="スコープ">
        <div className="space-y-2 text-sm">
          <label className="grid grid-cols-[6.5rem_1fr] gap-2">
            <span className="pt-2">Step1（MVP）:</span>
            <textarea
              value={values.scope_step1}
              onChange={set("scope_step1")}
              rows={3}
              className={fullInputClass}
            />
          </label>
          <label className="grid grid-cols-[6.5rem_1fr] gap-2">
            <span className="pt-2">Step2（最終）:</span>
            <textarea
              value={values.scope_step2}
              onChange={set("scope_step2")}
              rows={3}
              className={fullInputClass}
            />
          </label>
        </div>
      </Field>
    </form>
  );

  return (
    <DetailTabs
      projectId={project.id}
      info={info}
      logs={
        <ActivityLogList
          logs={logs}
          onChange={(log) =>
            setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)))
          }
          onDelete={(log) =>
            setLogs((prev) => prev.filter((l) => l.id !== log.id))
          }
        />
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          {(message || Object.keys(errors).length > 0) && (
            <p className="mr-auto text-xs text-red-600">
              {message ?? "入力内容を確認してください"}
            </p>
          )}
          <Link
            href={`/projects/${project.id}`}
            onClick={reset}
            className="inline-flex min-w-28 items-center justify-center rounded-md bg-cancel px-4 py-1.5 text-sm hover:bg-gray-300"
          >
            Cancel
          </Link>
          <Button type="submit" form={FORM_ID} disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    />
  );
}
