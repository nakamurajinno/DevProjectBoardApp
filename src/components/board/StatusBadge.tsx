import { Badge } from "@/components/ui/Badge";
import { statusOption } from "@/lib/constants";
import type { ProjectStatus } from "@/types";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const option = statusOption(status);
  return <Badge toneClass={option.badgeClass}>{option.label}</Badge>;
}
