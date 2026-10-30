"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activityLogRepository, projectRepository } from "@/lib/repositories";
import { validateActivityLogInput } from "@/lib/validation/activityLog";
import {
  validateProjectInput,
  type ProjectFieldErrors,
} from "@/lib/validation/project";

export type ProjectActionResult =
  | { errors: ProjectFieldErrors; message?: string }
  | undefined;

// 編集モード中に行った活動ログの変更。フッターの Save でプロジェクトと一緒に確定する。
export type ActivityLogChanges = {
  updated: { id: string; input: unknown }[];
  deleted: string[];
};

export async function createProject(
  input: unknown,
): Promise<ProjectActionResult> {
  const result = validateProjectInput(input);
  if (!result.ok) return { errors: result.errors };

  await projectRepository.create(result.data);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProject(
  id: string,
  input: unknown,
  logChanges: ActivityLogChanges = { updated: [], deleted: [] },
): Promise<ProjectActionResult> {
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

  const existing = await projectRepository.get(id);
  if (!existing) redirect("/");

  for (const { id: logId, data } of logUpdates)
    await activityLogRepository.update(logId, data);
  for (const logId of logChanges.deleted)
    await activityLogRepository.delete(logId, id);
  await projectRepository.update(id, result.data);
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await projectRepository.delete(id);
  revalidatePath("/", "layout");
  redirect("/");
}
