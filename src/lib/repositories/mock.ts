import type {
  ActivityLog,
  Project,
  ProjectInput,
  ProjectWithProgress,
} from "@/types";
import { MOCK_DEMO_ORG_ID, MOCK_OTHER_ORG_ID } from "@/lib/auth/mock";
import type { ActivityLogRepository, ProjectRepository } from "./types";

// インメモリのモックデータ。サーバープロセスが生きている間だけ保持される。
// dev の HMR でモジュールが再評価されてもデータが消えないよう globalThis に置く。
type MockStore = { projects: Project[]; logs: ActivityLog[] };

const seed = (): MockStore => ({
  projects: [
    {
      id: "p-001",
      status: "in_progress",
      name: "個人開発進捗管理アプリ",
      summary: "個人開発における進捗管理を行うWebアプリケーション",
      category: "web",
      planned_hours: 30,
      tech_stack: "Next.js/Supabase/Vercel",
      links: [
        { id: "l-001", label: "UI設計書", url: "https://example.com/ui-spec" },
        { id: "l-002", label: "Github", url: "https://github.com/" },
      ],
      scope_step1: "・一覧画面\n・詳細画面（参照、登録）",
      scope_step2: "・日報入力/参照\n・ユーザー/グループ認証",
      organization_id: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-01T09:00:00.000Z",
      updated_at: "2026-10-28T09:00:00.000Z",
    },
    {
      id: "p-002",
      status: "not_started",
      name: "家計簿スマホアプリ",
      summary: "レシート撮影で支出を自動記録する家計簿アプリ",
      category: "mobile",
      planned_hours: 50,
      tech_stack: "React Native/Expo/Supabase",
      links: [],
      scope_step1: "・支出登録\n・月次グラフ",
      scope_step2: "・レシートOCR",
      organization_id: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-10T09:00:00.000Z",
      updated_at: "2026-10-10T09:00:00.000Z",
    },
    {
      // 別の組織 (other@example.com) のプロジェクト。デモ組織のユーザーからは見えない
      id: "p-101",
      status: "in_progress",
      name: "別組織のプロジェクト",
      summary: "組織ごとのデータ分離を確認するためのサンプル",
      category: "tool",
      planned_hours: 10,
      tech_stack: "TypeScript",
      links: [],
      scope_step1: "",
      scope_step2: "",
      organization_id: MOCK_OTHER_ORG_ID,
      created_at: "2026-10-12T09:00:00.000Z",
      updated_at: "2026-10-12T09:00:00.000Z",
    },
  ],
  logs: [
    {
      id: "a-001",
      project_id: "p-001",
      worked_on: "2026-10-28",
      hours: 2,
      content: "・●●機能実装\n・▲▲機能不具合修正",
      organization_id: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-28T12:00:00.000Z",
    },
    {
      id: "a-002",
      project_id: "p-001",
      worked_on: "2026-10-07",
      hours: 0.5,
      content: "・■■機能実装",
      organization_id: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-07T12:00:00.000Z",
    },
    {
      id: "a-003",
      project_id: "p-001",
      worked_on: "2026-10-04",
      hours: 2.5,
      content: "・▲▲機能実装",
      organization_id: MOCK_DEMO_ORG_ID,
      created_at: "2026-10-04T12:00:00.000Z",
    },
  ],
});

// 組織対応前のデータ形式 (HMR で古いストアが残っている場合) に備えてキー名を変えている
const globalForMock = globalThis as unknown as { __mockStoreV2?: MockStore };
const store = (globalForMock.__mockStoreV2 ??= seed());

function findProject(orgId: string, id: string) {
  return store.projects.find((p) => p.id === id && p.organization_id === orgId);
}

function withProgress(project: Project): ProjectWithProgress {
  const actual_hours = store.logs
    .filter((log) => log.project_id === project.id)
    .reduce((sum, log) => sum + log.hours, 0);
  return structuredClone({ ...project, actual_hours });
}

function toLinks(input: ProjectInput) {
  return input.links.map((link) => ({ ...link, id: crypto.randomUUID() }));
}

export const mockProjectRepository: ProjectRepository = {
  async list(orgId) {
    return store.projects
      .filter((p) => p.organization_id === orgId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(withProgress);
  },

  async get(orgId, id) {
    const project = findProject(orgId, id);
    return project ? withProgress(project) : null;
  },

  async create(orgId, input) {
    const now = new Date().toISOString();
    const project: Project = {
      ...input,
      id: crypto.randomUUID(),
      organization_id: orgId,
      links: toLinks(input),
      created_at: now,
      updated_at: now,
    };
    store.projects.push(project);
    return withProgress(project);
  },

  async update(orgId, id, input) {
    const index = store.projects.findIndex(
      (p) => p.id === id && p.organization_id === orgId,
    );
    if (index === -1) throw new Error(`Project not found: ${id}`);
    const project: Project = {
      ...store.projects[index],
      ...input,
      links: toLinks(input),
      updated_at: new Date().toISOString(),
    };
    store.projects[index] = project;
    return withProgress(project);
  },

  async delete(orgId, id) {
    if (!findProject(orgId, id)) return;
    store.projects = store.projects.filter((p) => p.id !== id);
    store.logs = store.logs.filter((log) => log.project_id !== id);
  },
};

export const mockActivityLogRepository: ActivityLogRepository = {
  async listByProject(orgId, projectId) {
    return structuredClone(
      store.logs
        .filter((log) => log.project_id === projectId && log.organization_id === orgId)
        .sort(
          (a, b) =>
            b.worked_on.localeCompare(a.worked_on) ||
            b.created_at.localeCompare(a.created_at),
        ),
    );
  },

  async create(orgId, input) {
    if (!findProject(orgId, input.project_id))
      throw new Error(`Project not found: ${input.project_id}`);
    const log: ActivityLog = {
      ...input,
      id: crypto.randomUUID(),
      organization_id: orgId,
      created_at: new Date().toISOString(),
    };
    store.logs.push(log);
    return structuredClone(log);
  },

  async update(orgId, id, input) {
    const index = store.logs.findIndex(
      (log) =>
        log.id === id &&
        log.project_id === input.project_id &&
        log.organization_id === orgId,
    );
    if (index === -1) throw new Error(`Activity log not found: ${id}`);
    const log: ActivityLog = { ...store.logs[index], ...input };
    store.logs[index] = log;
    return structuredClone(log);
  },
  async delete(orgId, id, projectId) {
    const index = store.logs.findIndex(
      (log) =>
        log.id === id && log.project_id === projectId && log.organization_id === orgId,
    );
    if (index === -1) throw new Error(`Activity log not found: ${id}`);
    store.logs.splice(index, 1);
  },
};
