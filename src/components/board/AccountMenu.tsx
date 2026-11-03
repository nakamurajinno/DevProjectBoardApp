"use client";

import { Building2, KeyRound, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Menu, menuItemClass } from "@/components/ui/Floating";
import { Toast } from "@/components/ui/Toast";
import { roleOption } from "@/lib/auth/roles";
import type { AppUser } from "@/types";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { RoleBadge } from "./RoleBadge";

export function AccountMenu({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const closePasswordDialog = useCallback(() => setPasswordDialogOpen(false), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const onPasswordChanged = useCallback(() => {
    setPasswordDialogOpen(false);
    setToast("パスワードを変更しました");
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="max-w-48 truncate text-sm font-medium text-slate-800">{user.name}</p>
        <p className="max-w-48 truncate text-xs text-slate-500">
          {user.organizationName}・{roleOption(user.role).label}
        </p>
      </div>
      <button
        ref={triggerRef}
        type="button"
        className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-200 hover:text-slate-900"
        aria-label="アカウントメニュー"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound className="size-5" aria-hidden />
      </button>
      {open && (
        <Menu anchorRef={triggerRef} onClose={close} widthClass="w-64">
          <div className="space-y-1.5 border-b border-slate-100 px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            {user.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            <div className="flex items-center gap-1.5">
              <RoleBadge role={user.role} />
              <span className="truncate text-xs text-slate-500">{user.organizationName}</span>
            </div>
          </div>
          <div className="border-b border-slate-100 py-1">
            <Link
              href="/organization"
              role="menuitem"
              onClick={close}
              className={`${menuItemClass} hover:bg-slate-100`}
            >
              <Building2 className="size-4" aria-hidden />
              組織・メンバー
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                setPasswordDialogOpen(true);
              }}
              className={`${menuItemClass} hover:bg-slate-100`}
            >
              <KeyRound className="size-4" aria-hidden />
              パスワード変更
            </button>
          </div>
          <form action={logout} className="pt-1">
            <button
              role="menuitem"
              type="submit"
              className={`${menuItemClass} hover:bg-slate-100`}
            >
              <LogOut className="size-4" aria-hidden />
              ログアウト
            </button>
          </form>
        </Menu>
      )}
      {passwordDialogOpen && (
        <ChangePasswordDialog
          email={user.email}
          onClose={closePasswordDialog}
          onSuccess={onPasswordChanged}
        />
      )}
      {toast && <Toast message={toast} onClose={dismissToast} />}
    </div>
  );
}

export function AccountMenuSkeleton() {
  return <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" aria-hidden />;
}
