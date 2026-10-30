import type {
  ActivityLog,
  ActivityLogInput,
  ProjectInput,
  ProjectWithProgress,
} from "@/types";

// データアクセスの抽象。モック実装と Supabase 実装を差し替えられるようにする。
export interface ProjectRepository {
  list(): Promise<ProjectWithProgress[]>;
  get(id: string): Promise<ProjectWithProgress | null>;
  create(input: ProjectInput): Promise<ProjectWithProgress>;
  update(id: string, input: ProjectInput): Promise<ProjectWithProgress>;
  delete(id: string): Promise<void>;
}

export interface ActivityLogRepository {
  listByProject(projectId: string): Promise<ActivityLog[]>;
  create(input: ActivityLogInput): Promise<ActivityLog>;
  // project_id は所属確認にのみ使い、別プロジェクトへの付け替えはしない
  update(id: string, input: ActivityLogInput): Promise<ActivityLog>;
  delete(id: string, projectId: string): Promise<void>;
}
