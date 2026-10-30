import { mockActivityLogRepository, mockProjectRepository } from "./mock";
import {
  supabaseActivityLogRepository,
  supabaseProjectRepository,
} from "./supabase";
import type { ActivityLogRepository, ProjectRepository } from "./types";

// USE_MOCK_REPOSITORY=true のときはインメモリのモックを使う (Supabase 未接続での UI 確認用)
const useMock = process.env.USE_MOCK_REPOSITORY === "true";

export const projectRepository: ProjectRepository = useMock
  ? mockProjectRepository
  : supabaseProjectRepository;
export const activityLogRepository: ActivityLogRepository = useMock
  ? mockActivityLogRepository
  : supabaseActivityLogRepository;

export type { ActivityLogRepository, ProjectRepository };
