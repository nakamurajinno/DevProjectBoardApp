"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { Button, buttonClass, Field, fullInputClass, HoursInput, Select } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/FormAlert";
import { useProjectCreateForm } from "@/hooks/useProjectCreateForm";
import { CATEGORY_OPTIONS } from "@/lib/constants";

export function ProjectCreateForm() {
  const { values, bind, errors, message, pending, handleSubmit } = useProjectCreateForm();
  const nameRef = useRef<HTMLInputElement>(null);

  // 閉じたモーダルは <Activity> で隠されるだけなので、表示のたびに名前欄へフォーカスする
  useLayoutEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {message && <FormAlert>{message}</FormAlert>}
      <Field label="アプリ名" htmlFor="new-name" error={errors.name}>
        <input
          id="new-name"
          ref={nameRef}
          value={values.name}
          onChange={bind("name")}
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
          onChange={bind("summary")}
          aria-invalid={!!errors.summary}
          placeholder="個人開発における進捗管理を行うWebアプリケーション"
          rows={2}
          className={fullInputClass}
        />
      </Field>
      <div className="flex flex-wrap gap-10">
        <Field label="SW区分" htmlFor="new-category" error={errors.category}>
          <Select
            id="new-category"
            options={CATEGORY_OPTIONS}
            value={values.category}
            onChange={bind("category")}
            className="w-fit min-w-32"
          />
        </Field>
        <Field label="予定工数" htmlFor="new-hours" error={errors.planned_hours}>
          <HoursInput
            id="new-hours"
            step={0.5}
            value={values.planned_hours}
            onChange={bind("planned_hours")}
            aria-invalid={!!errors.planned_hours}
            placeholder="30"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Link href="/" scroll={false} className={buttonClass("secondary")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
      </div>
    </form>
  );
}
