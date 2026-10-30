import { connection } from "next/server";
import { activityLogRepository, projectRepository } from "@/lib/repositories";

// Server Component から使う読み取り API。
// Supabase 版は cookies() を読むため動的になるが、モック版はリクエスト時の API を
// 使わないので、どちらでも動的レンダリングになるよう connection() を呼んでおく。

export async function getProjects() {
  await connection();
  return projectRepository.list();
}

export async function getProject(id: string) {
  await connection();
  return projectRepository.get(id);
}

export async function getActivityLogs(projectId: string) {
  await connection();
  return activityLogRepository.listByProject(projectId);
}
