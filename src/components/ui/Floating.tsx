"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const GAP = 4;
const VIEWPORT_MARGIN = 8;

type FloatingProps = HTMLAttributes<HTMLDivElement> & {
  anchorRef: RefObject<HTMLElement | null>;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** 外側クリック / Escape で呼ばれる。指定時のみ有効 */
  onDismiss?: () => void;
};

// body 直下へポータル表示し、アンカー要素に合わせて fixed 配置する。
// テーブルの overflow コンテナに切り取られず、収まらない側は反対側へ開く。
function Floating({
  anchorRef,
  side = "bottom",
  align = "center",
  onDismiss,
  className = "",
  style,
  children,
  ...rest
}: FloatingProps) {
  const floatingRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current;
      const el = floatingRef.current;
      if (!anchor || !el) return;
      const a = anchor.getBoundingClientRect();
      const { width, height } = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;

      const below = a.bottom + GAP;
      const above = a.top - GAP - height;
      const fitsBelow = below + height <= vh - VIEWPORT_MARGIN;
      const fitsAbove = above >= VIEWPORT_MARGIN;
      const top =
        side === "top"
          ? fitsAbove || !fitsBelow ? above : below
          : fitsBelow || !fitsAbove ? below : above;

      const rawLeft =
        align === "start"
          ? a.left
          : align === "end"
            ? a.right - width
            : a.left + (a.width - width) / 2;
      const left = Math.min(
        Math.max(rawLeft, VIEWPORT_MARGIN),
        Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
      );

      el.style.top = `${Math.max(top, VIEWPORT_MARGIN)}px`;
      el.style.left = `${left}px`;
      el.style.visibility = "visible";
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, side, align]);

  useLayoutEffect(() => {
    if (!onDismiss) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !floatingRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      )
        onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onDismiss]);

  return createPortal(
    <div
      ref={floatingRef}
      style={{ position: "fixed", top: 0, left: 0, visibility: "hidden", ...style }}
      className={`z-50 ${className}`}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}

const tooltipClass =
  "pointer-events-none max-w-sm whitespace-pre-wrap break-words rounded-md bg-gray-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg";

// ホバー / フォーカスでヘルプテキストを表示する。
// focusable: 子要素自体がフォーカスできない場合 (テキスト等) に true。
export function Tooltip({
  content,
  className,
  focusable = false,
  children,
}: {
  content: ReactNode;
  className?: string;
  focusable?: boolean;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      ref={anchorRef}
      className={className}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && content && (
        <Floating anchorRef={anchorRef} id={id} role="tooltip" side="top" className={tooltipClass}>
          {content}
        </Floating>
      )}
    </span>
  );
}

export const menuClass =
  "w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg";
export const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2";

// トリガーボタンに紐づくドロップダウンメニュー。open 中のみマウントする。
export function Menu({
  anchorRef,
  onClose,
  align = "end",
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  align?: "start" | "center" | "end";
  children: ReactNode;
}) {
  return (
    <Floating
      anchorRef={anchorRef}
      role="menu"
      side="bottom"
      align={align}
      onDismiss={onClose}
      className={menuClass}
    >
      {children}
    </Floating>
  );
}
