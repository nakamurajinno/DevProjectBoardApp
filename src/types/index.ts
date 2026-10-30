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
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  project_id: string;
  worked_on: string; // YYYY-MM-DD
  hours: number;
  content: string;
  created_at: string;
};

// 一覧・詳細表示用。実績工数は活動ログの合計から算出する。
export type ProjectWithProgress = Project & {
  actual_hours: number;
};

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
