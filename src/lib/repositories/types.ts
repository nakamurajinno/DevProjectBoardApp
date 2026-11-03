import type {
  ActivityLog,
  ActivityLogInput,
  ProjectInput,
  ProjectWithProgress,
} from "@/types";

// データアクセスの抽象。モック実装と Supabase 実装を差し替えられるようにする。
// すべての操作は組織 (orgId) 単位で行い、他の組織のデータは参照・変更できない。
// (Supabase 版は RLS でも同じ制限をかけている)
export interface ProjectRepository {
  list(orgId: string): Promise<ProjectWithProgress[]>;
  get(orgId: string, id: string): Promise<ProjectWithProgress | null>;
  create(orgId: string, input: ProjectInput): Promise<ProjectWithProgress>;
  update(orgId: string, id: string, input: ProjectInput): Promise<ProjectWithProgress>;
  delete(orgId: string, id: string): Promise<void>;
}

export interface ActivityLogRepository {
  listByProject(orgId: string, projectId: string): Promise<ActivityLog[]>;
  create(orgId: string, input: ActivityLogInput): Promise<ActivityLog>;
  // project_id は所属確認にのみ使い、別プロジェクトへの付け替えはしない
  update(orgId: string, id: string, input: ActivityLogInput): Promise<ActivityLog>;
  delete(orgId: string, id: string, projectId: string): Promise<void>;
}
