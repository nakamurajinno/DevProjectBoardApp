"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useActionState } from "react";
import { inviteMember } from "@/app/actions/organization";
import { Button, inputClass } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/auth/roles";
import { CopyButton } from "./CopyButton";

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMember, undefined);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1 space-y-1.5">
          <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="member@example.com"
            // 成功したら入力欄を空にする
            key={state?.ok ? state.message : "form"}
            className={`${inputClass} w-full`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700">
            ロール
          </label>
          <select id="invite-role" name="role" defaultValue="editor" className={`${inputClass} w-full sm:w-36`}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          招待メールを送信
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
