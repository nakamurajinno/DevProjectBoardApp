import type { ReactNode } from "react";

// フォーム上部に表示するエラー / 完了メッセージ
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
