"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { changeUsername, type ChangeUsernameState } from "@/app/actions/auth";
import { FormAlert } from "@/components/ui/FormAlert";
import { Button, Field, fullInputClass } from "@/components/ui/form";
import { DialogModal } from "@/components/ui/Overlay";
import { USERNAME_MAX_LENGTH } from "@/lib/validation/auth";

// ログイン中のユーザーのユーザー名変更。成功したら onSuccess (呼び出し側でモーダルを閉じて通知する)
export function ChangeUsernameDialog({
  currentName,
  onClose,
  onSuccess,
}: {
  currentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ChangeUsernameState, formData: FormData) => {
      const result = await changeUsername(prev, formData);
      if (result?.ok) onSuccess();
      return result;
    },
    undefined,
  );
  const error = state?.ok === false ? state.errors?.username : undefined;
  const message = state?.ok === false ? state.message : undefined;

  return (
    <DialogModal title="ユーザー名変更" onClose={onClose} widthClass="max-w-md">
      <form action={formAction} className="space-y-4" noValidate>
        {message && <FormAlert>{message}</FormAlert>}
        <Field label="新しいユーザー名" htmlFor="username" error={error}>
          <input
            // エラー後に再送信しても入力内容を保つ
            key={state?.username ?? currentName}
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            defaultValue={state?.username ?? currentName}
            maxLength={USERNAME_MAX_LENGTH}
            autoFocus
            aria-invalid={error ? true : undefined}
            className={fullInputClass}
          />
          {!error && (
            <p className="text-xs text-slate-500">
              全角10文字（半角20文字）以内・「@」は使用できません。他のユーザーと同じ名前は登録できません
            </p>
          )}
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
