"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 閉じる = 一覧 (closeHref) へ戻る。URL と表示状態を一致させるためルーティングで開閉する。
function useCloseOnEscape(closeHref: string) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, closeHref]);
  return () => router.push(closeHref, { scroll: false });
}

export function Drawer({
  label,
  closeHref = "/",
  children,
}: {
  label: string;
  closeHref?: string;
  children: ReactNode;
}) {
  const close = useCloseOnEscape(closeHref);
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/10" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-[480px]"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 z-10 grid size-10 place-items-center sm:right-3 sm:top-3 sm:size-8 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="閉じる"
        >
          <X className="size-5" aria-hidden />
        </button>
        {children}
      </aside>
    </div>
  );
}

export function Modal({
  title,
  closeHref = "/",
  children,
}: {
  title: string;
  closeHref?: string;
  children: ReactNode;
}) {
  const close = useCloseOnEscape(closeHref);
  return (
    <ModalFrame title={title} onClose={close}>
      {children}
    </ModalFrame>
  );
}

// ルーティングを伴わず、呼び出し側の state で開閉するモーダル。
// テーブル行 (ホバー時のみ表示・overflow あり) の中から開けるよう body 直下へポータル表示する。
export function DialogModal({
  title,
  onClose,
  widthClass,
  children,
}: {
  title: string;
  onClose: () => void;
  widthClass?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <ModalFrame title={title} onClose={onClose} widthClass={widthClass}>
      {children}
    </ModalFrame>,
    document.body,
  );
}

function ModalFrame({
  title,
  onClose,
  widthClass = "max-w-2xl",
  children,
}: {
  title: string;
  onClose: () => void;
  widthClass?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    // 内容が画面より高い場合でも上端まで스크롤できるよう、grid の中央寄せではなく min-h-full の flex で配置する
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/20" onClick={onClose} aria-hidden />
      <div className="relative flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative w-full ${widthClass} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`}
        >
          <h2
            id={titleId}
            className="break-words border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900 sm:px-6"
          >
            {title}
          </h2>
          <div className="px-4 pb-5 pt-5 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
