import type { UserRole } from "@/types";

export const ROLE_OPTIONS: { value: UserRole; label: string; badgeClass: string }[] = [
  { value: "viewer", label: "参照ユーザー", badgeClass: "bg-slate-100 text-slate-600 ring-slate-200" },
  { value: "editor", label: "一般ユーザー", badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-200/70" },
  { value: "admin", label: "管理ユーザー", badgeClass: "bg-amber-50 text-amber-700 ring-amber-200/70" },
];

export function roleOption(role: UserRole) {
  return ROLE_OPTIONS.find((o) => o.value === role) ?? ROLE_OPTIONS[0];
}

// 一般ユーザー (editor) と 管理ユーザー (admin) はプロジェクト・活動ログを編集できる
export function canEdit(role: UserRole | undefined) {
  return role === "editor" || role === "admin";
}

// 管理ユーザーのみ、組織へのメンバー招待・ロール変更ができる
export function isAdmin(role: UserRole | undefined) {
  return role === "admin";
}

export function isUserRole(value: unknown): value is UserRole {
  return ROLE_OPTIONS.some((o) => o.value === value);
}
