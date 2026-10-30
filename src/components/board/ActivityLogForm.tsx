"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { createActivityLog } from "@/app/actions/activityLogs";
import { Button, Field, fullInputClass, inputClass } from "@/components/ui/form";
import {
  validateActivityLogInput,
  type ActivityLogFieldErrors,
} from "@/lib/validation/activityLog";
import type { ActivityLog, ActivityLogInput } from "@/types";

// ローカルタイムゾーンでの本日 (YYYY-MM-DD)。toISOString() は UTC になるため使わない。
function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// モーダルを閉じるとアンマウントされるため、入力値・エラーは開くたびに初期化される
// log を渡すと編集モードになり、その内容を初期値とする。
// 編集モードではサーバーへ保存せず、検証済みの値を onSaved に渡すだけ
// (プロジェクトの Save でまとめて確定し、Cancel で破棄できるようにするため)
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
  const [values, setValues] = useState(() => ({
    worked_on: log?.worked_on ?? today(),
    hours: log ? String(log.hours) : "",
    content: log?.content ?? "",
  }));
  const [errors, setErrors] = useState<ActivityLogFieldErrors>({});
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const hoursRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    hoursRef.current?.focus();
  }, []);

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage(undefined);
    const input = { ...values, project_id: projectId };
    if (log) {
      const result = validateActivityLogInput(input);
      if (result.ok) return onSaved(result.data);
      setErrors(result.errors);
      setMessage("入力内容を確認してください");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createActivityLog(input);
        if (result.ok) return onSaved();
        setErrors(result.errors ?? {});
        setMessage(result.message ?? "入力内容を確認してください");
      } catch {
        setMessage("保存に失敗しました。通信状況を確認して再度お試しください");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-10">
        <Field label="作業日" htmlFor="log-worked-on" error={errors.worked_on}>
          <input
            id="log-worked-on"
            type="date"
            value={values.worked_on}
            onChange={set("worked_on")}
            aria-invalid={!!errors.worked_on}
            required
            className={`${inputClass} w-fit`}
          />
        </Field>
        <Field label="作業時間" htmlFor="log-hours" error={errors.hours}>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="log-hours"
              ref={hoursRef}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={values.hours}
              onChange={set("hours")}
              aria-invalid={!!errors.hours}
              placeholder="1.5"
              required
              className={`${inputClass} w-24`}
            />
            <span>h</span>
          </div>
        </Field>
      </div>
      <Field label="作業内容" htmlFor="log-content" error={errors.content}>
        <textarea
          id="log-content"
          value={values.content}
          onChange={set("content")}
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
