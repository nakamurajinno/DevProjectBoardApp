import { Layers } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { AccountMenu, AccountMenuSkeleton } from "./AccountMenu";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-sm">
            <Layers className="size-5" aria-hidden />
          </span>
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 sm:text-lg">
            個人開発プロジェクト管理ボード
          </h1>
        </Link>
        {/* ログインユーザーはリクエスト時にしか決まらないため Suspense で囲む */}
        <Suspense fallback={<AccountMenuSkeleton />}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderAccount() {
  const user = await getCurrentUser();
  return user ? <AccountMenu user={user} /> : null;
}
