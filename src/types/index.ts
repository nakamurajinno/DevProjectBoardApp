// アプリ全体で使うドメイン型
// カラム名は将来の Supabase テーブル定義に合わせて snake_case で統一する。

export type ProjectStatus = "not_started" | "in_progress" | "done";

export type SoftwareCategory = "web" | "mobile" | "desktop" | "tool" | "other";

export type ProjectLink = {
  id: string;
  label: string;
  url: string;
};

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

// 活動ログ登録・更新時の入力値
export type ActivityLogInput = Pick<
  ActivityLog,
  "project_id" | "worked_on" | "hours" | "content"
>;

// ユーザーの権限 (所属組織内でのロール)。
// viewer: 参照ユーザ / editor: 一般ユーザ / admin: 管理ユーザ (一般ユーザ + メンバー招待・ロール変更)
export type UserRole = "viewer" | "editor" | "admin";

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

// 組織のメンバー (組織設定画面の一覧用)
export type OrganizationMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

// 未使用の招待
export type OrganizationInvitation = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  created_at: string;
  expires_at: string;
};

// 招待コードから分かる招待内容 (サインアップ画面用)
export type InvitationInfo = {
  organizationName: string;
  email: string;
  role: UserRole;
};
