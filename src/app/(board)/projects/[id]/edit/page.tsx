import { Suspense } from "react";
import {
  DrawerForbidden,
  DrawerLoading,
  DrawerNotFound,
} from "@/components/board/DrawerStates";
import { ProjectEditPanel } from "@/components/board/ProjectEditPanel";
import { Drawer } from "@/components/ui/Overlay";
import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getActivityLogs, getProject } from "@/lib/data/projects";

export default function ProjectEditPage({
  params,
}: PageProps<"/projects/[id]/edit">) {
  return (
    <Drawer label="詳細編集">
      <Suspense fallback={<DrawerLoading />}>
        <ProjectEdit params={params} />
      </Suspense>
    </Drawer>
  );
}

async function ProjectEdit({
  params,
}: {
  params: PageProps<"/projects/[id]/edit">["params"];
}) {
  const { id } = await params;
  // URL を直接開いた場合も、参照ユーザの権限では編集フォームを表示しない
  const user = await getCurrentUser();
  if (!canEdit(user?.role)) return <DrawerForbidden />;

  const [project, logs] = await Promise.all([
    getProject(id),
    getActivityLogs(id),
  ]);
  if (!project) return <DrawerNotFound />;

  // key: 保存後や一覧から活動ログを追加した後に再表示したとき、最新の値でフォームを初期化し直す
  // (活動ログの編集・削除はプロジェクトの Save で行うため updated_at も更新される)
  return (
    <ProjectEditPanel
      key={`${project.updated_at}:${logs.map((log) => log.id).join(",")}`}
      project={project}
      logs={logs}
    />
  );
}
