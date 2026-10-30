import type {
  ActivityLog,
  Project,
  ProjectInput,
  ProjectWithProgress,
} from "@/types";
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
      created_at: "2026-10-10T09:00:00.000Z",
      updated_at: "2026-10-10T09:00:00.000Z",
    },
  ],
  logs: [
    {
      id: "a-001",
      project_id: "p-001",
      worked_on: "2026-10-28",
      hours: 2,
      content: "・●●機能実装\n・▲▲機能不具合修正",
      created_at: "2026-10-28T12:00:00.000Z",
    },
    {
      id: "a-002",
      project_id: "p-001",
      worked_on: "2026-10-07",
      hours: 0.5,
      content: "・■■機能実装",
      created_at: "2026-10-07T12:00:00.000Z",
    },
    {
      id: "a-003",
      project_id: "p-001",
      worked_on: "2026-10-04",
      hours: 2.5,
      content: "・▲▲機能実装",
      created_at: "2026-10-04T12:00:00.000Z",
    },
  ],
});

const globalForMock = globalThis as unknown as { __mockStore?: MockStore };
const store = (globalForMock.__mockStore ??= seed());

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
  async list() {
    return [...store.projects]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(withProgress);
  },

  async get(id) {
    const project = store.projects.find((p) => p.id === id);
    return project ? withProgress(project) : null;
  },

  async create(input) {
    const now = new Date().toISOString();
    const project: Project = {
      ...input,
      id: crypto.randomUUID(),
      links: toLinks(input),
      created_at: now,
      updated_at: now,
    };
    store.projects.push(project);
    return withProgress(project);
  },

  async update(id, input) {
    const index = store.projects.findIndex((p) => p.id === id);
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

  async delete(id) {
    store.projects = store.projects.filter((p) => p.id !== id);
    store.logs = store.logs.filter((log) => log.project_id !== id);
  },
};

export const mockActivityLogRepository: ActivityLogRepository = {
  async listByProject(projectId) {
    return structuredClone(
      store.logs
        .filter((log) => log.project_id === projectId)
        .sort((a, b) => b.worked_on.localeCompare(a.worked_on)),
    );
  },
};
