"use client";

import { CircleCheck } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

const TOAST_DURATION_MS = 3000;

// 操作完了を知らせる通知。一定時間で onClose が呼ばれる (表示中のみマウントする)
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-full items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
      {message}
    </div>,
    document.body,
  );
}
