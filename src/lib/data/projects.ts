import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { activityLogRepository, projectRepository } from "@/lib/repositories";

// Server Component から使う読み取り API。ログインユーザーの所属組織のデータだけを返す。
// Supabase 版は cookies() を読むため動的になるが、モック版はリクエスト時の API を
// 使わないので、どちらでも動的レンダリングになるよう connection() を呼んでおく。

export async function getProjects() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return [];
  return projectRepository.list(user.organizationId);
}

export async function getProject(id: string) {
  await connection();
  const user = await getCurrentUser();
  if (!user) return null;
  return projectRepository.get(user.organizationId, id);
}

export async function getActivityLogs(projectId: string) {
  await connection();
  const user = await getCurrentUser();
  if (!user) return [];
  return activityLogRepository.listByProject(user.organizationId, projectId);
}
