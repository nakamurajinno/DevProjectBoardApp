import { canEdit } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembers } from "@/lib/data/organization";
import { getProjects } from "@/lib/data/projects";
import type { AssigneeOption } from "@/types";
import { ProjectTableHead, TABLE_HEADERS, tableContainerClass } from "./ProjectTableHead";
import { ProjectTableView } from "./ProjectTableView";

export async function ProjectTable() {
  const [projects, user, members] = await Promise.all([
    getProjects(),
    getCurrentUser(),
    getMembers(),
  ]);
  // 担当者フィルタの選択肢。クライアントへはメールアドレスを渡さない
  const assignees = members.map(({ id, name }): AssigneeOption => ({ id, name }));
  return (
    <ProjectTableView projects={projects} members={assignees} canEdit={canEdit(user?.role)} />
  );
}

export function ProjectTableSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="mt-3 h-5 w-2/3 rounded bg-slate-100" />
            <div className="mt-3 h-4 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className={tableContainerClass}>
        <table className="w-full min-w-[960px] table-fixed">
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
      </div>
    </>
  );
}
