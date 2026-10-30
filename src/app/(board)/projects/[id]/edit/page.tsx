import { Suspense } from "react";
import { ActivityLogList } from "@/components/board/ActivityLogList";
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

  // key: 保存後に再表示したとき、最新の値でフォームを初期化し直す
  return (
    <ProjectEditPanel
      key={project.updated_at}
      project={project}
      logs={<ActivityLogList logs={logs} />}
    />
  );
}
