import { Layers } from "lucide-react";
import type { ReactNode } from "react";

// ログイン・ユーザー登録・招待受諾画面の共通レイアウト
export function AuthShell({
  subtitle,
  footer,
  wide = false,
  children,
}: {
  subtitle: string;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* 背景: うっすらとしたグラデーションとドットパターン */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(91_110_225/0.12),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(148_163_184/0.25)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />

      <div className={`relative w-full ${wide ? "max-w-md" : "max-w-sm"}`}>
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-white shadow-md">
            <Layers className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              個人開発プロジェクト管理ボード
            </h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </main>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
        tone === "error" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </p>
  );
}

export const authLinkClass = "font-medium text-accent underline-offset-4 hover:underline";

export const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50";
