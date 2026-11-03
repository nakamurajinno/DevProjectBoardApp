"use client";

import { Building2, LoaderCircle, MailCheck, Ticket, UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { Field, fullInputClass } from "@/components/ui/form";
import { roleOption } from "@/lib/auth/roles";
import { PASSWORD_MIN, type SignupMode } from "@/lib/validation/auth";
import type { InvitationInfo } from "@/types";
import { authLinkClass, FormAlert, primaryButtonClass } from "./AuthShell";

const inputClass = `${fullInputClass} py-2.5`;

const MODES: { value: SignupMode; label: string; description: string; icon: typeof Building2 }[] = [
  {
    value: "create",
    label: "新規組織を作成して登録",
    description: "新しい組織を作成し、あなたが管理ユーザになります",
    icon: Building2,
  },
  {
    value: "join",
    label: "招待コードで参加",
    description: "管理ユーザから招待された既存の組織に参加します",
    icon: Ticket,
  },
];

export function SignupForm({
  initialToken,
  invitation,
}: {
  initialToken: string;
  invitation: InvitationInfo | null;
}) {
  const [state, formAction, pending] = useActionState(signup, undefined);
  const values = state?.values;
  const errors = state?.errors ?? {};
  const [mode, setMode] = useState<SignupMode>(
    values?.mode ?? (initialToken ? "join" : "create"),
  );

  if (state?.notice) {
    return (
      <div className="space-y-4 py-4 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-slate-700">{state.notice}</p>
        <Link href="/login" className={`${authLinkClass} text-sm`}>
          ログイン画面へ
        </Link>
      </div>
    );
  }

  // 有効な招待リンクから開いた場合は、招待されたメールアドレスで登録させる
  const lockedEmail = mode === "join" && invitation ? invitation.email : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message && <FormAlert>{state.message}</FormAlert>}

      <fieldset className="space-y-2">
        <legend className="mb-2 block text-sm font-medium text-slate-700">組織の選択</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg p-3 ring-1 ring-inset transition-colors ${
                mode === value
                  ? "bg-accent/5 ring-2 ring-accent"
                  : "bg-white ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Icon className="size-4 text-slate-500" aria-hidden />
                {label}
              </span>
              <span className="text-xs leading-relaxed text-slate-500">{description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "create" ? (
        <Field label="組織名" htmlFor="organizationName" error={errors.organizationName}>
          <input
            id="organizationName"
            name="organizationName"
            defaultValue={values?.organizationName}
            placeholder="例: 個人開発チーム"
            maxLength={100}
            aria-invalid={!!errors.organizationName}
            className={inputClass}
          />
        </Field>
      ) : (
        <div className="space-y-3">
          {invitation ? (
            <FormAlert tone="info">
              「{invitation.organizationName}」から「{roleOption(invitation.role).label}」として招待されています
            </FormAlert>
          ) : initialToken ? (
            <FormAlert>招待リンクが無効か、有効期限が切れています。管理ユーザに再度招待を依頼してください</FormAlert>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              既存の組織への参加には、組織の管理ユーザからの招待が必要です。招待メールが届いている場合は、メール内のリンクから登録してください。
            </p>
          )}
          <Field label="招待コード" htmlFor="invitationToken" error={errors.invitationToken}>
            <input
              id="invitationToken"
              name="invitationToken"
              defaultValue={values?.invitationToken ?? initialToken}
              placeholder="招待コード、または招待リンク"
              autoComplete="off"
              aria-invalid={!!errors.invitationToken}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
      )}

      <div className="space-y-4 border-t border-slate-100 pt-5">
        <Field label="ユーザー名（表示名）" htmlFor="displayName" error={errors.displayName}>
          <input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            defaultValue={values?.displayName}
            maxLength={50}
            placeholder="例: 山田 太郎"
            aria-invalid={!!errors.displayName}
            className={inputClass}
          />
        </Field>
        <Field label="メールアドレス" htmlFor="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            // 招待の有無で初期値が変わるため key で入れ直す
            key={lockedEmail ?? "free"}
            defaultValue={lockedEmail ?? values?.email}
            readOnly={!!lockedEmail}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            className={`${inputClass} read-only:bg-readonly read-only:text-slate-500`}
          />
        </Field>
        <Field label="パスワード" htmlFor="password" error={errors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={`${PASSWORD_MIN}文字以上`}
            aria-invalid={!!errors.password}
            className={inputClass}
          />
        </Field>
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="size-4" aria-hidden />
        )}
        {mode === "create" ? "組織を作成して登録" : "組織に参加して登録"}
      </button>
    </form>
  );
}
