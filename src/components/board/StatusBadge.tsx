import { statusOption } from "@/lib/constants";
import type { ProjectStatus } from "@/types";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const option = statusOption(status);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${option.badgeClass}`}
    >
      {option.label}
    </span>
  );
}
