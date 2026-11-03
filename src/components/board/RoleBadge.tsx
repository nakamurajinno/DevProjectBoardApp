import { roleOption } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export function RoleBadge({ role }: { role: UserRole }) {
  const option = roleOption(role);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${option.badgeClass}`}
    >
      {option.label}
    </span>
  );
}
