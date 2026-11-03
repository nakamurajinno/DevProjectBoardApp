import { isProjectStatus, isSoftwareCategory } from "@/lib/constants";
import type { ProjectInput } from "@/types";
import { str, toRecord } from "./shared";

export type ProjectFieldErrors = Partial<Record<keyof ProjectInput, string>>;

export type ProjectValidationResult =
  | { ok: true; data: ProjectInput }
  | { ok: false; errors: ProjectFieldErrors };

const NAME_MAX = 100;
const SUMMARY_MAX = 1000;

// クライアントから届く値は信用せず、サーバー側で必ずこの関数を通す
export function validateProjectInput(raw: unknown): ProjectValidationResult {
  const input = toRecord(raw);
  const errors: ProjectFieldErrors = {};

  const name = str(input.name);
  if (!name) errors.name = "アプリ名を入力してください";
  else if (name.length > NAME_MAX)
    errors.name = `アプリ名は${NAME_MAX}文字以内で入力してください`;

  const summary = str(input.summary);
  if (summary.length > SUMMARY_MAX)
    errors.summary = `概要は${SUMMARY_MAX}文字以内で入力してください`;

  const status = isProjectStatus(input.status) ? input.status : undefined;
  if (!status) errors.status = "状況を選択してください";

  const category = isSoftwareCategory(input.category) ? input.category : undefined;
  if (!category) errors.category = "SW区分を選択してください";

  const planned_hours = Number(input.planned_hours);
  if (
    input.planned_hours === "" ||
    !Number.isFinite(planned_hours) ||
    planned_hours < 0
  )
    errors.planned_hours = "予定工数は0以上の数値で入力してください";

  const rawLinks = Array.isArray(input.links) ? input.links : [];
  const links = rawLinks
    .map((link) => ({
      label: str(toRecord(link).label),
      url: str(toRecord(link).url),
    }))
    .filter((link) => link.label || link.url);
  if (links.some((link) => !/^https?:\/\//.test(link.url)))
    errors.links = "URLは http:// または https:// で始めてください";

  if (Object.keys(errors).length > 0 || !status || !category) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      status,
      name,
      summary,
      category,
      planned_hours,
      tech_stack: str(input.tech_stack),
      scope_step1: str(input.scope_step1),
      scope_step2: str(input.scope_step2),
      links,
    },
  };
}
