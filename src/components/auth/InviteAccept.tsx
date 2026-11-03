"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { acceptInviteSession, completeInvitation } from "@/app/actions/auth";
import { Field, fullInputClass } from "@/components/ui/form";
import { PASSWORD_MIN, USERNAME_MAX_LENGTH } from "@/lib/validation/auth";
import { FormAlert } from "@/components/ui/FormAlert";
import { authLinkClass, primaryButtonClass } from "./AuthShell";

type InvitedUser = { email: string; name: string; organizationName?: string };

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; user: InvitedUser };

const INVALID_LINK = "招待リンクが無効か、有効期限が切れています。組織の管理ユーザーに再度招待を依頼してください";

// 招待メールのリンクは、Supabase での確認後に URL のハッシュ
// (#access_token=...&refresh_token=...&type=invite) 付きでこの画面へ戻ってくる。
// ハッシュはサーバーへ送られないため、ブラウザで読み取ってサーバーアクションでセッションを作る。
export function InviteAccept({
  linkError,
  currentUser,
}: {
  linkError: boolean;
  currentUser: InvitedUser | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    // トークンを URL (履歴) に残さない
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const resolve = async (): Promise<Status> => {
      if (accessToken && refreshToken) {
        const result = await acceptInviteSession({ accessToken, refreshToken });
        return result.ok
          ? {
              kind: "ready",
              user: {
                email: result.email,
                name: result.username,
                organizationName: result.organizationName,
              },
            }
          : { kind: "error", message: result.message };
      }
      if (hash.get("error") || linkError) return { kind: "error", message: INVALID_LINK };
      if (currentUser) return { kind: "ready", user: currentUser };
      return { kind: "error", message: INVALID_LINK };
    };
    resolve().then(setStatus, () => setStatus({ kind: "error", message: INVALID_LINK }));
  }, [linkError, currentUser]);

  if (status.kind === "loading") {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        招待を確認しています…
      </p>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="space-y-4 text-center">
        <FormAlert>{status.message}</FormAlert>
        <Link href="/login" className={`${authLinkClass} text-sm`}>
          ログイン画面へ
        </Link>
      </div>
    );
  }

  return <CompleteForm user={status.user} />;
}

function CompleteForm({ user }: { user: InvitedUser }) {
  const [state, formAction, pending] = useActionState(completeInvitation, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <p className="text-sm leading-relaxed text-slate-600">
        {user.organizationName ? `「${user.organizationName}」への` : ""}
        招待を確認しました。ユーザー名とパスワードを設定して登録を完了してください。
      </p>
      {state?.message && <FormAlert>{state.message}</FormAlert>}

      <Field label="メールアドレス" htmlFor="email">
        <input
          id="email"
          type="email"
          value={user.email}
          readOnly
          autoComplete="username"
          className={`${fullInputClass} bg-readonly py-2.5 text-slate-500`}
        />
      </Field>
      <Field label="ユーザー名" htmlFor="username" error={errors.username}>
        <input
          id="username"
          name="username"
          autoComplete="nickname"
          defaultValue={user.name || user.email.split("@")[0]}
          maxLength={USERNAME_MAX_LENGTH}
          aria-invalid={!!errors.username}
          className={`${fullInputClass} py-2.5`}
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
          className={`${fullInputClass} py-2.5`}
        />
      </Field>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <KeyRound className="size-4" aria-hidden />
        )}
        登録を完了する
      </button>
    </form>
  );
}
