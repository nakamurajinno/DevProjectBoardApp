"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

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
      <div className="absolute inset-0 bg-black/10" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l-2 border-gray-900 bg-white shadow-2xl sm:w-[480px]"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100"
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
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/20" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-2xl border-2 border-gray-900 bg-white p-2 shadow-2xl"
      >
        <h2
          id="modal-title"
          className="rounded-md bg-panel-title px-3 py-2.5 text-sm"
        >
          {title}
        </h2>
        <div className="px-4 pb-3 pt-4 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
