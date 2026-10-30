"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";
import { Button, Field, fullInputClass, inputClass } from "@/components/ui/form";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import type { ProjectFieldErrors } from "@/lib/validation/project";
import type { SoftwareCategory } from "@/types";

const INITIAL_VALUES = {
  name: "",
  summary: "",
  category: "web" as SoftwareCategory,
  planned_hours: "",
};

export function ProjectCreateForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  // Cache Components では閉じたモーダルもアンマウントされず <Activity> で隠されるだけなので、
  // 表示のたびに名前欄へフォーカスし、隠れるタイミングで入力値・エラーを初期状態へ戻す。
  useLayoutEffect(() => {
    nameRef.current?.focus();
    return () => {
      setValues(INITIAL_VALUES);
      setErrors({});
    };
  }, []);

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const result = await createProject({
        ...values,
        status: "not_started",
        tech_stack: "",
        scope_step1: "",
        scope_step2: "",
        links: [],
      });
      if (result?.errors) setErrors(result.errors);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="アプリ名" htmlFor="new-name" error={errors.name}>
        <input
          id="new-name"
          ref={nameRef}
          value={values.name}
          onChange={set("name")}
          aria-invalid={!!errors.name}
          placeholder="個人開発進捗管理アプリ"
          required
          className={fullInputClass}
        />
      </Field>
      <Field label="概要" htmlFor="new-summary" error={errors.summary}>
        <textarea
          id="new-summary"
          value={values.summary}
          onChange={set("summary")}
          aria-invalid={!!errors.summary}
          placeholder="個人開発における進捗管理を行うWebアプリケーション"
          rows={2}
          className={fullInputClass}
        />
      </Field>
      <div className="flex flex-wrap gap-10">
        <Field label="SW区分" htmlFor="new-category" error={errors.category}>
          <select
            id="new-category"
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
        <Field label="予定工数" htmlFor="new-hours" error={errors.planned_hours}>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="new-hours"
              type="number"
              min={0}
              step={0.5}
              value={values.planned_hours}
              onChange={set("planned_hours")}
              aria-invalid={!!errors.planned_hours}
              placeholder="30"
              className={`${inputClass} w-24`}
            />
            <span>h</span>
          </div>
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/"
          scroll={false}
          className="inline-flex min-w-28 items-center justify-center rounded-md bg-cancel px-4 py-1.5 text-sm hover:bg-gray-300"
        >
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
      </div>
    </form>
  );
}
