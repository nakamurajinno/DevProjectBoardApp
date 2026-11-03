"use client";

import { useTransition } from "react";
import { changeMemberRole } from "@/app/actions/organization";
import { RoleBadge } from "@/components/board/RoleBadge";
import { inputClass } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/auth/roles";
import type { OrganizationMember } from "@/types";

const dateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

export function MemberList({
  members,
  currentUserId,
  editable,
}: {
  members: OrganizationMember[];
  currentUserId: string;
  editable: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
            {member.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {member.name}
              {member.id === currentUserId && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">（あなた）</span>
              )}
            </p>
            <p className="truncate text-xs text-slate-500">
              {member.email}
              <span className="hidden sm:inline">・{dateFormat.format(new Date(member.created_at))} 参加</span>
            </p>
          </div>
          {editable ? <RoleSelect member={member} /> : <RoleBadge role={member.role} />}
        </li>
      ))}
    </ul>
  );
}

function RoleSelect({ member }: { member: OrganizationMember }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={`${member.name}のロール`}
      // 変更に失敗した場合はサーバーの値に戻す
      key={member.role}
      defaultValue={member.role}
      disabled={pending}
      onChange={(e) => {
        const select = e.currentTarget;
        const role = select.value;
        startTransition(async () => {
          const result = await changeMemberRole(member.id, role);
          if (!result.ok) {
            alert(result.message);
            select.value = member.role;
          }
        });
      }}
      className={`${inputClass} w-32 py-1.5 text-xs disabled:opacity-50`}
    >
      {ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
