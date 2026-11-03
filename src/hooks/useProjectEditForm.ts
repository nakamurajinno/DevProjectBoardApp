"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateProject, type ActivityLogChanges } from "@/app/actions/projects";
import { useFormErrors } from "@/hooks/useFormErrors";
import { useFormValues } from "@/hooks/useFormValues";
import type { ActivityLog, LinkDraft, ProjectFormValues, ProjectInput, ProjectWithProgress } from "@/types";

type EditValues = Omit<ProjectFormValues, "links">;

// 編集モードに入った時点の値。Cancel ではこの値に戻してから参照画面へ遷移する。
function initialDraft(project: ProjectWithProgress, logs: ActivityLog[]) {
  const values: EditValues = {
    status: project.status,
    name: project.name,
    summary: project.summary,
    category: project.category,
    planned_hours: String(project.planned_hours),
    tech_stack: project.tech_stack,
    scope_step1: project.scope_step1,
    scope_step2: project.scope_step2,
  };
  const links = project.links.map(({ id, label, url }): LinkDraft => ({ key: id, label, url }));
  return { values, links, logs };
}

// 編集前後の活動ログから、Save で送る変更 (更新・削除) を求める
function diffLogs(before: ActivityLog[], after: ActivityLog[]): ActivityLogChanges {
  const remaining = new Set(after.map((log) => log.id));
  return {
    updated: after
      .filter((log) => !before.includes(log))
      .map(({ id, project_id, worked_on, hours, content }) => ({
        id,
        input: { project_id, worked_on, hours, content },
      })),
    deleted: before.filter((log) => !remaining.has(log.id)).map((log) => log.id),
  };
}

// プロジェクト詳細の編集フォーム (PJ情報・関連リンク・活動ログ)。
// cacheComponents では参照画面へ戻ってもこの画面は <Activity> で state ごと保持される。
// Cancel 時に reset で明示的に元の値へ戻さないと、次に Edit を開いたとき破棄したはずの入力が残ってしまう。
export function useProjectEditForm(project: ProjectWithProgress, initialLogs: ActivityLog[]) {
  const [initial] = useState(() => initialDraft(project, initialLogs));
  const { values, setValues, bind } = useFormValues(initial.values);
  const [links, setLinks] = useState<LinkDraft[]>(initial.links);
  // 活動ログの編集・削除は Save まで下書きとして保持する
  const [logs, setLogs] = useState(initial.logs);
  const { errors, message, hasErrors, clear, fail } = useFormErrors<keyof ProjectInput>();
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setValues(initial.values);
    setLinks(initial.links);
    setLogs(initial.logs);
    clear();
  };

  const updateLog = (log: ActivityLog) =>
    setLogs((prev) => prev.map((l) => (l.id === log.id ? log : l)));

  const removeLog = (log: ActivityLog) => setLogs((prev) => prev.filter((l) => l.id !== log.id));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clear();
    startTransition(async () => {
      // 成功時はサーバー側で参照画面へリダイレクトするため、戻り値があるのは失敗時のみ
      const result = await updateProject(
        project.id,
        { ...values, links: links.map(({ label, url }) => ({ label, url })) },
        diffLogs(initial.logs, logs),
      );
      if (result) fail(result.errors, result.message);
    });
  };

  return {
    values,
    bind,
    links,
    setLinks,
    logs,
    updateLog,
    removeLog,
    errors,
    message,
    hasErrors,
    pending,
    handleSubmit,
    reset,
  };
}
