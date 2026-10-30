import { getProjects } from "@/lib/data/projects";
import { ProjectTableHead, TABLE_HEADERS } from "./ProjectTableHead";
import { ProjectTableView } from "./ProjectTableView";

export async function ProjectTable() {
  const projects = await getProjects();
  return <ProjectTableView projects={projects} />;
}

export function ProjectTableSkeleton() {
  return (
    <table className="w-full min-w-[860px] table-fixed">
      <ProjectTableHead />
      <tbody>
        {[0, 1].map((i) => (
          <tr key={i} className="border-b border-gray-300">
            <td colSpan={TABLE_HEADERS.length} className="px-3 py-5">
              <div className="h-5 animate-pulse rounded bg-gray-100" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
