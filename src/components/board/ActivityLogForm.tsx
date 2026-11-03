"use client";

import { useLayoutEffect, useRef } from "react";
import { Button, Field, fullInputClass, HoursInput, inputClass } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/FormAlert";
import { useActivityLogForm } from "@/hooks/useActivityLogForm";
import type { ActivityLog, ActivityLogInput } from "@/types";

// モーダルを閉じるとアンマウントされるため、入力値・エラーは開くたびに初期化される。
// log を渡すと編集モード (保存せず onSaved に検証済みの値を渡す。詳細は useActivityLogForm を参照)
export function ActivityLogForm({
  projectId,
  log,
  onCancel,
  onSaved,
}: {
  projectId: string;
  log?: ActivityLog;
  onCancel: () => void;
  onSaved: (draft?: ActivityLogInput) => void;
}) {
  const { values, bind, errors, message, pending, handleSubmit } = useActivityLogForm({
    projectId,
    log,
    onSaved,
  });
  const hoursRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    hoursRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {message && <FormAlert>{message}</FormAlert>}
      <div className="flex flex-wrap gap-10">
        <Field label="作業日" htmlFor="log-worked-on" error={errors.worked_on}>
          <input
            id="log-worked-on"
            type="date"
            value={values.worked_on}
            onChange={bind("worked_on")}
            aria-invalid={!!errors.worked_on}
            required
            className={`${inputClass} w-fit`}
          />
        </Field>
        <Field label="作業時間" htmlFor="log-hours" error={errors.hours}>
          <HoursInput
            id="log-hours"
            ref={hoursRef}
            inputMode="decimal"
            step="any"
            value={values.hours}
            onChange={bind("hours")}
            aria-invalid={!!errors.hours}
            placeholder="1.5"
            required
          />
        </Field>
      </div>
      <Field label="作業内容" htmlFor="log-content" error={errors.content}>
        <textarea
          id="log-content"
          value={values.content}
          onChange={bind("content")}
          aria-invalid={!!errors.content}
          placeholder={"・機能実装\n・不具合修正"}
          rows={5}
          required
          className={fullInputClass}
        />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
