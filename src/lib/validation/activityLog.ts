import type { ActivityLogInput } from "@/types";

export type ActivityLogFieldErrors = Partial<
  Record<keyof ActivityLogInput, string>
>;

export type ActivityLogValidationResult =
  | { ok: true; data: ActivityLogInput }
  | { ok: false; errors: ActivityLogFieldErrors };

const CONTENT_MAX = 2000;
// activity_logs.hours は numeric(5, 2)
const HOURS_MAX = 999.99;

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// YYYY-MM-DD 形式かつ実在する日付か
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// クライアントから届く値は信用せず、サーバー側で必ずこの関数を通す
export function validateActivityLogInput(
  raw: unknown,
): ActivityLogValidationResult {
  const input = (raw ?? {}) as Record<string, unknown>;
  const errors: ActivityLogFieldErrors = {};

  const project_id = str(input.project_id);
  if (!project_id) errors.project_id = "対象プロジェクトが不明です";

  const worked_on = str(input.worked_on);
  if (!isValidDate(worked_on)) errors.worked_on = "作業日を選択してください";

  const rawHours = str(String(input.hours ?? ""));
  const hours = Number(rawHours);
  if (!/^\d+(\.\d+)?$/.test(rawHours) || hours <= 0)
    errors.hours = "作業時間は0より大きい半角数値で入力してください";
  else if (hours > HOURS_MAX)
    errors.hours = `作業時間は${HOURS_MAX}以下で入力してください`;
  else if (!/^\d+(\.\d{1,2})?$/.test(rawHours))
    errors.hours = "作業時間は小数第2位までで入力してください";

  const content = str(input.content);
  if (!content) errors.content = "作業内容を入力してください";
  else if (content.length > CONTENT_MAX)
    errors.content = `作業内容は${CONTENT_MAX}文字以内で入力してください`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { project_id, worked_on, hours, content } };
}
