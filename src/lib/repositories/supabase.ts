import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  ActivityLog,
  ProjectInput,
  ProjectLink,
  ProjectWithProgress,
} from "@/types";
import type { ActivityLogRepository, ProjectRepository } from "./types";

// Supabase 実装。テーブル定義は supabase/migrations を参照。
// サーバー専用 (cookies() を読むクライアントを使う)。

type ProjectRow =
  Database["public"]["Views"]["projects_with_progress"]["Row"];
type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];

// id 列は uuid 型なので、形式外の値で問い合わせると DB エラーになる。事前に弾く。
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toProject(row: ProjectRow): ProjectWithProgress {
  return {
    ...row,
    planned_hours: Number(row.planned_hours),
    actual_hours: Number(row.actual_hours),
    links: Array.isArray(row.links) ? (row.links as ProjectLink[]) : [],
  };
}

function toActivityLog(row: ActivityLogRow): ActivityLog {
  return { ...row, hours: Number(row.hours) };
}

function toRow(input: ProjectInput) {
  return {
    ...input,
    links: input.links.map((link) => ({ ...link, id: crypto.randomUUID() })),
  };
}

export const supabaseProjectRepository: ProjectRepository = {
  async list(orgId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects_with_progress")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data.map(toProject);
  },

  async get(orgId, id) {
    if (!UUID_RE.test(id)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects_with_progress")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toProject(data) : null;
  },

  async create(orgId, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...toRow(input), organization_id: orgId })
      .select("*")
      .single();
    if (error) throw error;
    // 新規作成直後は活動ログがないため実績は 0
    return toProject({ ...data, actual_hours: 0 });
  },

  async update(orgId, id, input) {
    if (!UUID_RE.test(id)) throw new Error(`Project not found: ${id}`);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .update(toRow(input))
      .eq("organization_id", orgId)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Project not found: ${id}`);

    const project = await this.get(orgId, id);
    if (!project) throw new Error(`Project not found: ${id}`);
    return project;
  },

  async delete(orgId, id) {
    if (!UUID_RE.test(id)) return;
    const supabase = await createClient();
    // 活動ログは外部キーの on delete cascade で一緒に削除される
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("organization_id", orgId)
      .eq("id", id);
    if (error) throw error;
  },
};

export const supabaseActivityLogRepository: ActivityLogRepository = {
  async listByProject(orgId, projectId) {
    if (!UUID_RE.test(projectId)) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("organization_id", orgId)
      .eq("project_id", projectId)
      .order("worked_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(toActivityLog);
  },

  async create(orgId, input) {
    if (!UUID_RE.test(input.project_id))
      throw new Error(`Project not found: ${input.project_id}`);
    const supabase = await createClient();
    // organization_id は DB のトリガーでプロジェクトと同じ組織が設定される (RLS で自組織か検証される)
    const { data, error } = await supabase
      .from("activity_logs")
      .insert({ ...input, organization_id: orgId })
      .select("*")
      .single();
    if (error) throw error;
    return toActivityLog(data);
  },

  async update(orgId, id, { project_id, ...values }) {
    if (!UUID_RE.test(id) || !UUID_RE.test(project_id))
      throw new Error(`Activity log not found: ${id}`);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .update(values)
      .eq("organization_id", orgId)
      .eq("id", id)
      .eq("project_id", project_id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Activity log not found: ${id}`);
    return toActivityLog(data);
  },
  async delete(orgId, id, projectId) {
    if (!UUID_RE.test(id) || !UUID_RE.test(projectId))
      throw new Error(`Activity log not found: ${id}`);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .delete()
      .eq("organization_id", orgId)
      .eq("id", id)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Activity log not found: ${id}`);
  },
};
