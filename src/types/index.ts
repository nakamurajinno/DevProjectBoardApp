import type { Database } from "./database";

// アプリ全体で使うドメイン型
// カラム名は Supabase のテーブル定義 (src/types/database.ts) に合わせて snake_case で統一する。

type Enums = Database["public"]["Enums"];

export type ProjectStatus = Enums["project_status"];

export type SoftwareCategory = Enums["software_category"];

export type ProjectLink = {
  id: string;
  label: string;
  url: string;
};

// 編集フォームでの関連リンク。key は並び替え・削除で行を識別するためのクライアント側の ID
export type LinkDraft = Omit<ProjectLink, "id"> & { key: string };

export type Project = {
  id: string;
  status: ProjectStatus;
  name: string;
  summary: string;
  category: SoftwareCategory;
  planned_hours: number;
  tech_stack: string;
  links: ProjectLink[];
  scope_step1: string;
  scope_step2: string;
  organization_id: string;
  // 登録者 (profiles.id)。登録者が退会した場合は null
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  project_id: string;
  worked_on: string; // YYYY-MM-DD
  hours: number;
  content: string;
  organization_id: string;
  // 登録者 (profiles.id) とそのユーザー名。登録者が退会した場合は null
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

// 一覧・詳細表示用。実績工数は活動ログの合計から算出する。
// created_by_name は登録者のユーザー名。
export type ProjectWithProgress = Project & {
  actual_hours: number;
  created_by_name: string | null;
};

// 登録を行うユーザー (リポジトリの create に渡す)
export type Creator = { id: string; name: string };

// 登録・更新時の入力値
export type ProjectInput = Pick<
  Project,
  | "status"
  | "name"
  | "summary"
  | "category"
  | "planned_hours"
  | "tech_stack"
  | "scope_step1"
  | "scope_step2"
> & {
  links: Omit<ProjectLink, "id">[];
};

// 登録・編集フォームの入力値。数値入力欄は入力途中の値を保持するため文字列で持つ
// (サーバー側の validateProjectInput で ProjectInput に変換・検証する)
export type ProjectFormValues = Omit<ProjectInput, "planned_hours"> & {
  planned_hours: string;
};

// 活動ログ登録・更新時の入力値
export type ActivityLogInput = Pick<
  ActivityLog,
  "project_id" | "worked_on" | "hours" | "content"
>;

// ユーザーの権限 (所属組織内でのロール)。
// viewer: 参照ユーザー / editor: 一般ユーザー / admin: 管理ユーザー (一般ユーザー + メンバー招待・ロール変更)
export type UserRole = Enums["user_role"];

// ログイン中のユーザー。クライアントへ渡してよい項目だけを持つ。
// name はユーザー名 (profiles.username)。
export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  organizationId: string;
  organizationName: string;
};

// 活動ログフォームの入力値 (作業時間は入力途中の値を保持するため文字列)
export type ActivityLogFormValues = Omit<ActivityLogInput, "hours"> & {
  hours: string;
};

// 組織のメンバー (組織設定画面の一覧用)
export type OrganizationMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

// 一覧の担当者フィルタの選択肢。クライアントへはメールアドレスを渡さない
export type AssigneeOption = Pick<OrganizationMember, "id" | "name">;

// ロール変更の 1 件分 (組織設定画面の「変更を保存」で送る)
export type MemberRoleChange = { userId: string; role: UserRole };

// 招待コードから分かる招待内容 (サインアップ画面用)
export type InvitationInfo = {
  organizationName: string;
  // 招待リンク (ロール指定のみ) は null。従来のメールアドレス指定の招待のみ値がある
  email: string | null;
  role: UserRole;
};
