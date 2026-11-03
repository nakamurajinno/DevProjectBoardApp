"use server";

import { revalidatePath } from "next/cache";
import { FORBIDDEN_MESSAGE, requireEditor } from "@/lib/auth/session";
import { activityLogRepository, projectRepository } from "@/lib/repositories";
import {
  validateActivityLogInput,
  type ActivityLogFieldErrors,
} from "@/lib/validation/activityLog";

export type ActivityLogActionResult =
  | { ok: true }
  | { ok: false; errors?: ActivityLogFieldErrors; message?: string };

export async function createActivityLog(
  input: unknown,
): Promise<ActivityLogActionResult> {
  const user = await requireEditor();
  if (!user) return { ok: false, message: FORBIDDEN_MESSAGE };

  const result = validateActivityLogInput(input);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    const project = await projectRepository.get(
      user.organizationId,
      result.data.project_id,
    );
    if (!project)
      return { ok: false, message: "対象のプロジェクトが見つかりません" };

    await activityLogRepository.create(user.organizationId, result.data, {
      id: user.id,
      name: user.name,
    });
  } catch (error) {
    console.error("Failed to create activity log", error);
    return {
      ok: false,
      message: "保存に失敗しました。時間をおいて再度お試しください",
    };
  }

  // 一覧の実績工数と詳細の活動ログ一覧の両方を更新する
  revalidatePath("/", "layout");
  return { ok: true };
}
