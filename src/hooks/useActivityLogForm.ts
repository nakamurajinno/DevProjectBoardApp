"use client";

import { useTransition, type FormEvent } from "react";
import { createActivityLog } from "@/app/actions/activityLogs";
import { useFormErrors } from "@/hooks/useFormErrors";
import { useFormValues } from "@/hooks/useFormValues";
import { today } from "@/lib/format";
import { validateActivityLogInput } from "@/lib/validation/activityLog";
import type { ActivityLog, ActivityLogInput } from "@/types";

const INVALID_MESSAGE = "入力内容を確認してください";

// 活動ログの入力フォーム。
// log を渡すと編集モードになり、その内容を初期値とする。編集モードではサーバーへ保存せず、
// 検証済みの値を onSaved に渡すだけ (プロジェクトの Save でまとめて確定し、Cancel で破棄できるようにするため)
export function useActivityLogForm({
  projectId,
  log,
  onSaved,
}: {
  projectId: string;
  log?: ActivityLog;
  onSaved: (draft?: ActivityLogInput) => void;
}) {
  const { values, bind } = useFormValues(() => ({
    worked_on: log?.worked_on ?? today(),
    hours: log ? String(log.hours) : "",
    content: log?.content ?? "",
  }));
  const { errors, message, clear, fail } = useFormErrors<keyof ActivityLogInput>();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clear();
    const input = { ...values, project_id: projectId };
    if (log) {
      const result = validateActivityLogInput(input);
      if (result.ok) onSaved(result.data);
      else fail(result.errors, INVALID_MESSAGE);
      return;
    }
    startTransition(async () => {
      try {
        const result = await createActivityLog(input);
        if (result.ok) onSaved();
        else fail(result.errors, result.message ?? INVALID_MESSAGE);
      } catch {
        fail({}, "保存に失敗しました。通信状況を確認して再度お試しください");
      }
    });
  };

  return { values, bind, errors, message, pending, handleSubmit };
}
