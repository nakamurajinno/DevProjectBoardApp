"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FORBIDDEN_MESSAGE, requireEditor } from "@/lib/auth/session";
import { activityLogRepository, projectRepository } from "@/lib/repositories";
import { validateActivityLogInput } from "@/lib/validation/activityLog";
import {
  validateProjectInput,
  type ProjectFieldErrors,
} from "@/lib/validation/project";
import type { ActivityLogFormValues, ActivityLogInput, ProjectFormValues } from "@/types";

export type ProjectActionResult =
  | { errors: ProjectFieldErrors; message?: string }
  | undefined;

// 編集モード中に行った活動ログの変更。フッターの Save でプロジェクトと一緒に確定する。
export type ActivityLogChanges = {
  updated: { id: string; input: ActivityLogInput | ActivityLogFormValues }[];
  deleted: string[];
};

// 引数の型はクライアント側の呼び出しのためのもの。
// 届いた値は信用せず、validate* 関数でサーバー側で必ず検証する。
export async function createProject(
  input: ProjectFormValues,
): Promise<ProjectActionResult> {
  const user = await requireEditor();
  if (!user) return { errors: {}, message: FORBIDDEN_MESSAGE };

  const result = validateProjectInput(input);
  if (!result.ok) return { errors: result.errors };

  await projectRepository.create(user.organizationId, result.data, {
    id: user.id,
    name: user.name,
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProject(
  id: string,
  input: ProjectFormValues,
  logChanges: ActivityLogChanges = { updated: [], deleted: [] },
): Promise<ProjectActionResult> {
  const user = await requireEditor();
  if (!user) return { errors: {}, message: FORBIDDEN_MESSAGE };

  const result = validateProjectInput(input);
  if (!result.ok) return { errors: result.errors };

  // 書き込む前に活動ログもすべて検証し、一部だけ保存される状態を避ける
  const logUpdates = [];
  for (const { id: logId, input: logInput } of logChanges.updated) {
    const log = validateActivityLogInput(logInput);
    if (!log.ok || log.data.project_id !== id)
      return { errors: {}, message: "活動ログの入力内容を確認してください" };
    logUpdates.push({ id: logId, data: log.data });
  }

  const existing = await projectRepository.get(user.organizationId, id);
  if (!existing) redirect("/");

  for (const { id: logId, data } of logUpdates)
    await activityLogRepository.update(user.organizationId, logId, data);
  for (const logId of logChanges.deleted)
    await activityLogRepository.delete(user.organizationId, logId, id);
  await projectRepository.update(user.organizationId, id, result.data);
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const user = await requireEditor();
  if (!user) return { errors: {}, message: FORBIDDEN_MESSAGE };

  await projectRepository.delete(user.organizationId, id);
  revalidatePath("/", "layout");
  redirect("/");
}
