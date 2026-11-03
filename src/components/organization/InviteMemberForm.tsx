"use client";

import { Link2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { inviteMember } from "@/app/actions/organization";
import { Button, inputClass } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import { CopyButton } from "./CopyButton";

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: "閲覧のみ",
  editor: "編集が可能",
  admin: "組織の管理が可能",
};

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMember, undefined);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1 space-y-1.5 sm:max-w-xs">
          <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700">
            招待するユーザーのロール
          </label>
          <select id="invite-role" name="role" defaultValue="editor" className={`${inputClass} w-full`}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}（{ROLE_DESCRIPTIONS[o.value]}）
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Link2 className="size-4" aria-hidden />
          )}
          招待リンクを発行
        </Button>
      </form>

      {state && (
        <div
          role={state.ok ? "status" : "alert"}
          className={`space-y-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
            state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          <p>{state.message}</p>
          {state.errorDetails && state.errorDetails.length > 0 && (
            <details className="rounded bg-white px-2 py-1.5 text-slate-700 ring-1 ring-inset ring-slate-200">
              <summary className="cursor-pointer select-none font-medium">エラー詳細</summary>
              <ul className="mt-1.5 space-y-1">
                {state.errorDetails.map((detail) => (
                  <li key={detail} className="font-mono text-[11px] break-all whitespace-pre-wrap">
                    {detail}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {state.inviteUrl && (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">
                {state.inviteUrl}
              </code>
              <CopyButton text={state.inviteUrl} label="招待リンクをコピー" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
