import { Layers } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white shadow-sm">
            <Layers className="size-5" aria-hidden />
          </span>
          <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            個人開発プロジェクト管理ボード
          </h1>
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
