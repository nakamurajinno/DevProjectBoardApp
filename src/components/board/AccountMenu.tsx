"use client";

import { LogOut, UserRound } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Menu, menuItemClass } from "@/components/ui/Floating";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="grid size-10 place-items-center rounded-full bg-black text-white hover:bg-gray-800"
        aria-label="アカウントメニュー"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound className="size-5" aria-hidden />
      </button>
      {open && (
        <Menu anchorRef={triggerRef} onClose={close}>
          {/* TODO: 認証導入後にログアウト処理を実装する */}
          <button
            role="menuitem"
            type="button"
            className={`${menuItemClass} hover:bg-gray-100`}
            onClick={close}
          >
            <LogOut className="size-4" aria-hidden />
            ログアウト
          </button>
        </Menu>
      )}
    </>
  );
}
