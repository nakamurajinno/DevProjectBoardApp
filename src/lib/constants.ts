import type { ProjectStatus, SoftwareCategory } from "@/types";

export const STATUS_OPTIONS: {
  value: ProjectStatus;
  label: string;
  badgeClass: string;
}[] = [
  { value: "not_started", label: "未着手", badgeClass: "bg-status-todo text-gray-900" },
  { value: "in_progress", label: "対応中", badgeClass: "bg-status-doing text-gray-900" },
  { value: "done", label: "完了", badgeClass: "bg-status-done text-gray-900" },
];

export const CATEGORY_OPTIONS: { value: SoftwareCategory; label: string }[] = [
  { value: "web", label: "Webアプリ" },
  { value: "mobile", label: "スマホアプリ" },
  { value: "desktop", label: "デスクトップアプリ" },
  { value: "tool", label: "ツール・ライブラリ" },
  { value: "other", label: "その他" },
];

export function statusOption(status: ProjectStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
}

export function categoryLabel(category: SoftwareCategory) {
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}
