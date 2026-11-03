"use client";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { Field, fullInputClass, HoursInput, Select } from "@/components/ui/form";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatHours } from "@/lib/format";
import type { ProjectFieldErrors } from "@/lib/validation/project";
import type { LinkDraft, ProjectFormValues } from "@/types";
import { LinksEditor } from "./LinksEditor";

type EditValues = Omit<ProjectFormValues, "links">;
type Bind = (
  key: keyof EditValues,
) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

// 詳細編集画面の「PJ情報詳細」タブのフォーム。Save ボタンはフッターに置き、form 属性 (formId) で紐づける
export function ProjectEditFields({
  formId,
  values,
  bind,
  links,
  setLinks,
  errors,
  actualHours,
  onSubmit,
}: {
  formId: string;
  values: EditValues;
  bind: Bind;
  links: LinkDraft[];
  setLinks: Dispatch<SetStateAction<LinkDraft[]>>;
  errors: ProjectFieldErrors;
  actualHours: number;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="状況" htmlFor="status" error={errors.status}>
        <Select
          id="status"
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={bind("status")}
          className="w-fit min-w-32"
        />
      </Field>
      <Field label="アプリ名" htmlFor="name" error={errors.name}>
        <input
          id="name"
          value={values.name}
          onChange={bind("name")}
          aria-invalid={!!errors.name}
          required
          className={fullInputClass}
        />
      </Field>
      <Field label="概要" htmlFor="summary" error={errors.summary}>
        <textarea
          id="summary"
          value={values.summary}
          onChange={bind("summary")}
          aria-invalid={!!errors.summary}
          rows={3}
          className={fullInputClass}
        />
      </Field>
      <Field label="SW区分" htmlFor="category" error={errors.category}>
        <Select
          id="category"
          options={CATEGORY_OPTIONS}
          value={values.category}
          onChange={bind("category")}
          className="w-fit min-w-32"
        />
      </Field>
      <Field label="工数" htmlFor="planned_hours" error={errors.planned_hours}>
        <HoursInput
          id="planned_hours"
          step={0.5}
          value={values.planned_hours}
          onChange={bind("planned_hours")}
          aria-invalid={!!errors.planned_hours}
          leading={
            <span className="whitespace-nowrap text-slate-500" title="実績工数（活動ログの合計）">
              {formatHours(actualHours)} /
            </span>
          }
        />
      </Field>
      <Field label="技術構成" htmlFor="tech_stack">
        <input
          id="tech_stack"
          value={values.tech_stack}
          onChange={bind("tech_stack")}
          placeholder="Next.js/Supabase/Vercel"
          className={fullInputClass}
        />
      </Field>
      <Field label="関連リンク" error={errors.links}>
        <LinksEditor links={links} setLinks={setLinks} />
      </Field>
      <Field label="スコープ">
        <div className="space-y-2 text-sm">
          <ScopeTextarea label="Step1（MVP）:" value={values.scope_step1} onChange={bind("scope_step1")} />
          <ScopeTextarea label="Step2（最終）:" value={values.scope_step2} onChange={bind("scope_step2")} />
        </div>
      </Field>
    </form>
  );
}

function ScopeTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="grid grid-cols-[6.5rem_1fr] gap-2">
      <span className="pt-2 text-slate-500">{label}</span>
      <textarea value={value} onChange={onChange} rows={3} className={fullInputClass} />
    </label>
  );
}
