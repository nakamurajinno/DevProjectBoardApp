import { Building2 } from "lucide-react";
import { RoleBadge } from "@/components/board/RoleBadge";
import type { AppUser } from "@/types";

// 所属組織名とログインユーザーの権限
export function OrganizationSummary({ user }: { user: AppUser }) {
  return (
    <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Building2 className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">所属組織</p>
        <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{user.organizationName}</h2>
      </div>
      <div className="text-right">
        <p className="mb-1 text-xs text-slate-500">あなたの権限</p>
        <RoleBadge role={user.role} />
      </div>
    </section>
  );
}
