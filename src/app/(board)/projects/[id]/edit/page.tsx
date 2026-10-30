import { Suspense } from "react";
import { DrawerLoading, DrawerNotFound } from "@/components/board/DrawerStates";
import { ProjectEditPanel } from "@/components/board/ProjectEditPanel";
import { Drawer } from "@/components/ui/Overlay";
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
