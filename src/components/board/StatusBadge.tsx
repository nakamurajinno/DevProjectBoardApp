import { statusOption } from "@/lib/constants";
import type { ProjectStatus } from "@/types";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const option = statusOption(status);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-0.5 text-xs ${option.badgeClass}`}
    >
      {option.label}
    </span>
  );
}
