"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { revokeInvitation } from "@/app/actions/organization";
import { RoleBadge } from "@/components/board/RoleBadge";
import { Tooltip } from "@/components/ui/Floating";
import type { OrganizationInvitation } from "@/types";
import { CopyButton } from "./CopyButton";

const dateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" });

export function InvitationList({ invitations }: { invitations: OrganizationInvitation[] }) {
  if (invitations.length === 0)
    return <p className="text-sm text-slate-500">招待中のユーザーはいません</p>;

  return (
    <ul className="divide-y divide-slate-100">
      {invitations.map((invitation) => (
        <InvitationItem key={invitation.id} invitation={invitation} />
      ))}
    </ul>
  );
}

function InvitationItem({ invitation }: { invitation: OrganizationInvitation }) {
  const [pending, startTransition] = useTransition();

  const revoke = () => {
    if (!confirm(`${invitation.email} への招待を取り消しますか？`)) return;
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (!result.ok) alert(result.message);
    });
  };

  return (
    <li className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{invitation.email}</p>
        <p className="text-xs text-slate-500">
          有効期限 {dateFormat.format(new Date(invitation.expires_at))}・招待コード{" "}
          <code className="font-mono">{invitation.token}</code>
        </p>
      </div>
      <RoleBadge role={invitation.role} />
      <CopyButton
        text={() => `${window.location.origin}/signup?invite=${invitation.token}`}
        label="招待リンクをコピー"
      />
      <Tooltip content="招待を取り消す">
        <button
          type="button"
          onClick={revoke}
          disabled={pending}
          aria-label={`${invitation.email}への招待を取り消す`}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </Tooltip>
    </li>
  );
}
