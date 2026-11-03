import { Badge } from "@/components/ui/Badge";
import { roleOption } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export function RoleBadge({ role }: { role: UserRole }) {
  const option = roleOption(role);
  return (
    <Badge toneClass={option.badgeClass} size="sm">
      {option.label}
    </Badge>
  );
}
