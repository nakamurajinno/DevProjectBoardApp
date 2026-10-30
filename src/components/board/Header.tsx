import { Layers } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";

export function Header() {
  return (
    <header className="bg-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border-2 border-sky-400 bg-logo text-white">
            <Layers className="size-5" aria-hidden />
          </span>
          <h1 className="text-lg font-medium text-gray-900 sm:text-2xl">
            個人開発プロジェクト管理ボード
          </h1>
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
