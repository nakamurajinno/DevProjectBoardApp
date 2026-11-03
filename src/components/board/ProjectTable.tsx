import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjects } from "@/lib/data/projects";
import { ProjectTableHead, TABLE_HEADERS } from "./ProjectTableHead";
import { ProjectTableView } from "./ProjectTableView";

export async function ProjectTable() {
  const [projects, user] = await Promise.all([getProjects(), getCurrentUser()]);
  return <ProjectTableView projects={projects} canEdit={canEdit(user?.role)} />;
}

export function ProjectTableSkeleton() {
  return (
    <table className="w-full min-w-[860px] table-fixed">
      <ProjectTableHead />
      <tbody>
        {[0, 1].map((i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            <td colSpan={TABLE_HEADERS.length} className="px-4 py-5">
              <div className="h-5 animate-pulse rounded bg-slate-100" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
