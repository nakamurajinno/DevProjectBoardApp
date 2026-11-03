"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/auth";
import { FormAlert } from "@/components/auth/AuthShell";
import { Button, Field, fullInputClass } from "@/components/ui/form";
import { DialogModal } from "@/components/ui/Overlay";
import { PASSWORD_MIN } from "@/lib/validation/auth";

// ログイン中のユーザーのパスワード変更。成功したら onSuccess (呼び出し側でモーダルを閉じて通知する)
export function ChangePasswordDialog({
  email,
  onClose,
  onSuccess,
}: {
  email: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ChangePasswordState, formData: FormData) => {
      const result = await changePassword(prev, formData);
      if (result?.ok) onSuccess();
      return result;
    },
    undefined,
  );
  const errors = state?.ok === false ? state.errors : undefined;
  const message = state?.ok === false ? state.message : undefined;

  const passwordInput = (
    name: keyof NonNullable<typeof errors>,
    autoComplete: "current-password" | "new-password",
  ) => (
    <input
      id={name}
      name={name}
      type="password"
      autoComplete={autoComplete}
      aria-invalid={errors?.[name] ? true : undefined}
      className={fullInputClass}
    />
  );

  return (
    <DialogModal title="パスワード変更" onClose={onClose} widthClass="max-w-md">
      <form action={formAction} className="space-y-4" noValidate>
        {message && <FormAlert>{message}</FormAlert>}
        {/* パスワードマネージャーがどのアカウントのパスワードか判別できるようにする */}
        {email && (
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        )}
        <Field label="現在のパスワード" htmlFor="currentPassword" error={errors?.currentPassword}>
          {passwordInput("currentPassword", "current-password")}
        </Field>
        <Field label="新しいパスワード" htmlFor="newPassword" error={errors?.newPassword}>
          {passwordInput("newPassword", "new-password")}
          {!errors?.newPassword && (
            <p className="text-xs text-slate-500">{PASSWORD_MIN}文字以上で入力してください</p>
          )}
        </Field>
        <Field label="新しいパスワード（確認）" htmlFor="confirmPassword" error={errors?.confirmPassword}>
          {passwordInput("confirmPassword", "new-password")}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            キャンセル
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            変更する
          </Button>
        </div>
      </form>
    </DialogModal>
  );
}
