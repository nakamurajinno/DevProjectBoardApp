import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityLogList } from "@/components/board/ActivityLogList";
import { DetailTabs } from "@/components/board/DetailTabs";
import { DrawerLoading, DrawerNotFound } from "@/components/board/DrawerStates";
import { ProjectInfoView } from "@/components/board/ProjectInfoView";
import { Drawer } from "@/components/ui/Overlay";
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
  const [project, logs] = await Promise.all([
    getProject(id),
    getActivityLogs(id),
  ]);
  if (!project) return <DrawerNotFound />;

  return (
    <DetailTabs
      projectId={project.id}
      info={<ProjectInfoView project={project} />}
      logs={<ActivityLogList logs={logs} />}
      footer={
        <div className="flex justify-end">
          <Link
            href={`/projects/${project.id}/edit`}
            scroll={false}
            className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Pencil className="size-4" aria-hidden />
            Edit
          </Link>
        </div>
      }
    />
  );
}
