import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityLogList } from "@/components/board/ActivityLogList";
import { DetailTabs } from "@/components/board/DetailTabs";
import { DrawerLoading, DrawerNotFound } from "@/components/board/DrawerStates";
import { ProjectInfoView } from "@/components/board/ProjectInfoView";
import { Drawer } from "@/components/ui/Overlay";
import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getActivityLogs, getProject } from "@/lib/data/projects";

export default function ProjectDetailPage({
  params,
}: PageProps<"/projects/[id]">) {
  return (
    <Drawer label="詳細参照">
      <Suspense fallback={<DrawerLoading />}>
        <ProjectDetail params={params} />
      </Suspense>
    </Drawer>
  );
}

async function ProjectDetail({
  params,
}: {
  params: PageProps<"/projects/[id]">["params"];
}) {
  const { id } = await params;
  const [project, logs, user] = await Promise.all([
    getProject(id),
    getActivityLogs(id),
    getCurrentUser(),
  ]);
  if (!project) return <DrawerNotFound />;

  // 参照ユーザの権限では Edit ボタン (フッター) を表示しない
  return (
    <DetailTabs
      projectId={project.id}
      info={<ProjectInfoView project={project} />}
      logs={<ActivityLogList logs={logs} />}
      footer={
        canEdit(user?.role) && (
          <div className="flex justify-end">
            <Link
              href={`/projects/${project.id}/edit`}
              scroll={false}
              className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
          </div>
        )
      }
    />
  );
}
