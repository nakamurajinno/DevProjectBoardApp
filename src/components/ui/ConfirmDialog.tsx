"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "./form";
import { DialogModal } from "./Overlay";

// はい / いいえ で確認するダイアログ
export function ConfirmDialog({
  title,
  children,
  confirmLabel = "はい",
  cancelLabel = "いいえ",
  confirmVariant = "primary",
  confirmDisabled = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogModal title={title} onClose={onClose} widthClass="max-w-md">
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </DialogModal>
  );
}
