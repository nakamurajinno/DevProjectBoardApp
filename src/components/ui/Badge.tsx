import type { ReactNode } from "react";

const SIZES = {
  md: "px-2.5 py-0.5 text-xs",
  sm: "px-2 py-0.5 text-[11px]",
} as const;

// ステータス・ロールなどを表す丸いラベル。色は toneClass (背景・文字・枠線) で指定する
export function Badge({
  toneClass,
  size = "md",
  children,
}: {
  toneClass: string;
  size?: keyof typeof SIZES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${SIZES[size]} ${toneClass}`}
    >
      {children}
    </span>
  );
}
