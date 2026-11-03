"use client";

import { Building2, KeyRound, LogOut, PencilLine, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef } from "react";
import { logout } from "@/app/actions/auth";
import { Menu, menuItemClass } from "@/components/ui/Floating";
import { Toast } from "@/components/ui/Toast";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useToast } from "@/hooks/useToast";
import { roleOption } from "@/lib/auth/roles";
import type { AppUser } from "@/types";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ChangeUsernameDialog } from "./ChangeUsernameDialog";
import { RoleBadge } from "./RoleBadge";

export function AccountMenu({ user }: { user: AppUser }) {
  const menu = useDisclosure();
  const passwordDialog = useDisclosure();
  const usernameDialog = useDisclosure();
  const toast = useToast();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { close: closeMenu } = menu;
  const { open: openPasswordDialog, close: closePasswordDialog } = passwordDialog;
  const { open: openUsernameDialog, close: closeUsernameDialog } = usernameDialog;
  const { show: showToast } = toast;

  const onPasswordChanged = useCallback(() => {
    closePasswordDialog();
    showToast("パスワードを変更しました");
  }, [closePasswordDialog, showToast]);

  const onUsernameChanged = useCallback(() => {
    closeUsernameDialog();
    showToast("ユーザー名を変更しました");
  }, [closeUsernameDialog, showToast]);

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
        aria-expanded={menu.isOpen}
        onClick={menu.toggle}
      >
        <UserRound className="size-5" aria-hidden />
      </button>
      {menu.isOpen && (
        <Menu anchorRef={triggerRef} onClose={closeMenu} widthClass="w-64">
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
              onClick={closeMenu}
              className={`${menuItemClass} hover:bg-slate-100`}
            >
              <Building2 className="size-4" aria-hidden />
              組織・メンバー
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                openUsernameDialog();
              }}
              className={`${menuItemClass} hover:bg-slate-100`}
            >
              <PencilLine className="size-4" aria-hidden />
              ユーザー名変更
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                openPasswordDialog();
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
      {passwordDialog.isOpen && (
        <ChangePasswordDialog
          email={user.email}
          onClose={closePasswordDialog}
          onSuccess={onPasswordChanged}
        />
      )}
      {usernameDialog.isOpen && (
        <ChangeUsernameDialog
          currentName={user.name}
          onClose={closeUsernameDialog}
          onSuccess={onUsernameChanged}
        />
      )}
      {toast.message && <Toast message={toast.message} onClose={toast.dismiss} />}
    </div>
  );
}

export function AccountMenuSkeleton() {
  return <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" aria-hidden />;
}
