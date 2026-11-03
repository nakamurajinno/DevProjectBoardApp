import { UserMinus } from "lucide-react";
import { RoleBadge } from "@/components/board/RoleBadge";
import { Select } from "@/components/ui/form";
import { isUserRole, ROLE_OPTIONS } from "@/lib/auth/roles";
import { formatJapaneseDate } from "@/lib/format";
import type { OrganizationMember, UserRole } from "@/types";

// メンバー一覧の 1 行。editable のときはロールを選択でき、保存前の変更は「未保存」と表示する。
// また、組織から除外するボタンを表示する (自分自身には表示せず、最後の管理ユーザーは押せない)
export function MemberRow({
  member,
  role,
  isCurrentUser,
  editable,
  disabled,
  removeBlockedReason,
  onRoleChange,
  onRemove,
}: {
  member: OrganizationMember;
  role: UserRole;
  isCurrentUser: boolean;
  editable: boolean;
  disabled: boolean;
  // 除外できない理由 (除外できる場合は null)
  removeBlockedReason: string | null;
  onRoleChange: (role: UserRole) => void;
  onRemove: () => void;
}) {
  const changed = role !== member.role;
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
        {member.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {member.name}
          {isCurrentUser && <span className="ml-1.5 text-xs font-normal text-slate-400">（あなた）</span>}
        </p>
        <p className="truncate text-xs text-slate-500">
          {member.email}
          <span className="hidden sm:inline">・{formatJapaneseDate(member.created_at)} 参加</span>
        </p>
      </div>
      {editable ? (
        <div className="flex items-center gap-2">
          {changed && <span className="text-xs text-amber-600">未保存</span>}
          <Select
            aria-label={`${member.name}のロール`}
            options={ROLE_OPTIONS}
            value={role}
            disabled={disabled}
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (isUserRole(value)) onRoleChange(value);
            }}
            className={`w-32 py-1.5 text-xs disabled:opacity-50 ${changed ? "border-amber-400" : ""}`}
          />
          {isCurrentUser ? (
            // 自分自身は除外できないため、ボタンの代わりに同じ幅の余白を置いて列を揃える
            <span className="size-8 shrink-0" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled || removeBlockedReason !== null}
              title={removeBlockedReason ?? "組織から除外"}
              aria-label={`${member.name}を組織から除外`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors enabled:hover:bg-red-50 enabled:hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserMinus className="size-4" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <RoleBadge role={member.role} />
      )}
    </li>
  );
}
