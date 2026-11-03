"use client";

import { LoaderCircle, LogIn, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { login } from "@/app/actions/auth";
import { fullInputClass } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/FormAlert";
import { primaryButtonClass } from "./AuthShell";
import { roleOption } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

const ERROR_MESSAGES: Record<string, string> = {
  link: "リンクが無効か、有効期限が切れています",
};

// 確認メールのリンク (/auth/callback, /auth/confirm) から ?error=... 付きで戻ってきたときのメッセージ
// useSearchParams はリクエスト時にしか決まらないため、フォーム本体と分けて Suspense で囲む
export function LoginErrorFromQuery() {
  const error = useSearchParams().get("error");
  const message = error ? ERROR_MESSAGES[error] : undefined;
  if (!message) return null;
  return (
    <div className="mb-5">
      <FormAlert>{message}</FormAlert>
    </div>
  );
}

export type PreviewAccount = {
  id: string;
  email: string;
  role: UserRole;
  organizationName: string;
};

// メールアドレスまたはユーザー名とパスワードでログインする。押したボタンの intent をサーバーへ送る
// (モックモードではプレビュー用アカウントのボタンも同じフォームに置き、「ログイン状態保持」を共有する)
// 未登録のユーザーは自動登録せず、ユーザー登録画面へ案内する
export function LoginForm({ previewAccounts }: { previewAccounts?: PreviewAccount[] }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [intent, setIntent] = useState<string>();
  const message = state?.message;

  const busy = (value: string) => pending && intent === value;
  const submitProps = (value: string) => ({
    type: "submit" as const,
    name: "intent",
    value,
    disabled: pending,
    onClick: () => setIntent(value),
  });

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {message && (
        <FormAlert>
          {message}
          {state?.notRegistered && (
            <>
              <br />
              <Link
                href="/signup"
                className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                <UserPlus className="size-3.5" aria-hidden />
                新規ユーザー登録へ
              </Link>
            </>
          )}
        </FormAlert>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
            メールアドレスまたはユーザー名
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state?.identifier}
            key={state?.identifier}
            placeholder="you@example.com"
            className={`${fullInputClass} py-2.5`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${fullInputClass} py-2.5`}
          />
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="size-4 cursor-pointer rounded border-slate-300 accent-primary"
          />
          ログイン状態を保持する
        </label>
      </div>

      <button {...submitProps("password")} className={primaryButtonClass}>
        {busy("password") ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="size-4" aria-hidden />
        )}
        ログイン
      </button>

      {previewAccounts && previewAccounts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            プレビュー用ログイン（モックモード / パスワードは <code className="font-mono">password</code>）
          </p>
          <div className="grid grid-cols-2 gap-2">
            {previewAccounts.map((account) => (
              <button
                key={account.id}
                {...submitProps(`preview:${account.id}`)}
                title={`${account.email}（${account.organizationName}）`}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-white px-2 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                <UserRound className="size-3.5" aria-hidden />
                {roleOption(account.role).label}
                <span className="text-slate-400">・{account.organizationName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
